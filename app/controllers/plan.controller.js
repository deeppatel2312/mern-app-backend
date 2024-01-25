const db = require("../models");
const Plan = db.plan;
const User = db.user;
var nodemailer = require("nodemailer");
var bcrypt = require("bcryptjs");
const getAllSettings = require("../constants/settings");
let settings = null;
(async () => {
    settings = await getAllSettings();
})();

// the date format is ISO 8601
// i want to split the date at T, so i can get the date and time separately
// this is a function to accept the date and return the date in YYYY-MM-DD format
function getFormattedDate(date) {
    let dateStr = date.toISOString().split('T')[0];
    return dateStr;
}

// make a function to count all services with status 1
exports.countAll = (req, res) => {
    Plan.countDocuments({ status: 1 })
        .then(count => {
            res.send(JSON.stringify(count));
        })
        .catch(err => {
            res.status(500).send({
                status: false,
                message: err.message || "Some error occurred while retrieving services."
            });
        });
}

exports.findAll = (req, res) => {
    const pageSize = req.body.pageSize || 1;
    const pageNumber = req.body.pageNumber || 1;
    const skip = (pageNumber - 1) * pageSize;
    const sortField = req.body.sortField || 'name';
    const sortOrder = req.body.sortOrder || 'desc';
    const search = req.body.search || '';

    const sort = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    Plan.find({
        $or: [
            { name: { $regex: search, $options: 'i' } }
        ]
    })
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .then(plans => {
            Plan.countDocuments({
                $or: [
                    { name: { $regex: search, $options: 'i' } }
                ]
            })
                .then(count => {
                    res.send({ plans, count: Math.floor(count / pageSize), status: true });
                })
                .catch(err => {
                    res.status(500).send({
                        status: false,
                        message: err.message || "Some error occurred while retrieving services."
                    });
                });
        })
        .catch(err => {
            res.status(500).send({
                status: false,
                message: err.message || "Some error occurred while retrieving services."
            });
        });
};

// Find Record by ID 
exports.findById = (req, res) => {
    const id = req.body.id;

    Plan.find({ "_id": id }).then(data => {
        // console.log(data)
        res.send(JSON.stringify(data[0]));
    }).catch(err => {
        res.status(500).send({
            status: false,
            message: err.message || "Some error occurred while retrieving services."
        });
    });

}

// Delete Record by ID 
exports.deleteById = (req, res) => {
    const id = req.body.id;

    Plan.deleteOne({ "_id": id }).then(data => {
        console.log(data)
        res.send(JSON.stringify(data));
    }).catch(err => {
        res.status(500).send({
            status: false,
            message: err.message || "Some error occurred while retrieving services."
        });
    });

}

// Update Record by ID 
exports.update = (req, res) => {
    console.log(req.body)
    Plan.updateOne({ _id: req.body._id }, req.body).then(data => {
        console.log(data)
        res.send(JSON.stringify(data));
    }).catch(err => {
        res.status(500).send({
            status: false,
            message: err.message || "Some error occurred while retrieving services."
        });
    });

}

// Create Record by ID 
exports.create = (req, res) => {
    // console.log(req.body)
    // req.body.password = bcrypt.hashSync(req.body.password, 8),
    Plan.insertMany([req.body]).then(data => {
        console.log(data)
        res.send(JSON.stringify(data));
    }).catch(err => {
        res.status(500).send({
            status: false,
            message: err.message || "Some error occurred while retrieving services."
        });
    });

}

// release function is to send email to all providers
exports.release = async (req, res) => {
    try {
        let planData = await Plan.findById(req.body.id);
        let providerData = await User.find({ userType: "provider", isActive: true, isApproved: true }).select('email');

        const emailString = providerData.map(item => item.email).join(',');

        const benefitsList = planData.description.split(', ');

        const promoContent = `
            <h2>Introducing Our Subscription Plan: ${planData.name}</h2>
            <p>Experience the benefits of our subscription plan designed just for you!</p>
            
            <h3>Features:</h3>
            <ul>
                ${benefitsList.map(benefit => `<li>${benefit}</li>`).join('')}
            </ul>

            <p>Use promo code <strong>${planData.promoCode}</strong> and enjoy exclusive perks!</p>

            <h3>Price:</h3>
            <p>
                ${planData.discount ? `<s>${planData.price === 0 ? 'Free' : `$${planData.price.toFixed(2)}`}</s>` : ''}
                ${planData.discount ? `$${(planData.price - (planData.price * (planData.discount / 100))).toFixed(2)}` : `$${planData.price.toFixed(2)}`}
            </p>

            ${planData.discount ? `<p>Offer: ${planData.discount}% discount applied!</p>` : ''}

            <p>This special offer is exclusively yours once you redeem it.</p>

            <p><strong>Offer Duration:</strong> ${planData.duration} days</p>

            <p>Thank you for choosing us!</p>
            `;

        const transporter = nodemailer.createTransport({
            service: settings.smtpService,
            auth: {
                user: settings.gmailUsername,
                pass: settings.gmailAppPassword,
            },
        });

        await transporter.sendMail({
            from: settings.emailFrom,
            to: emailString,
            subject: "Unlock Exclusive Benefits",
            html: promoContent,
        });

        return res.status(200).send({
            status: true,
            message: "Promo Code Released."
        });
    } catch (err) {
        console.log('Error while getting provider list: ', err);

        return res.status(500).send({
            status: false,
            message: "Error while getting provider list"
        });
    }
}