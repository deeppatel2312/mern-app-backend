const db = require("../models");
const Transaction = db.transaction;
const User = db.user;
var mongoose = require("mongoose");
const ExcelJS = require("exceljs");

function getFormattedDate(date) {
    // let dateStr = date.toISOString().split("T")[0];
    let dateStr = date.toLocaleString().split(",")[0];
    dateStr = dateStr.split("/");
    if (dateStr[0] < 10) {
        dateStr[0] = "0" + dateStr[0];
    }
    if (dateStr[1] < 10) {
        dateStr[1] = "0" + dateStr[1];
    }
    dateStr = dateStr.reverse().join("-");
    return dateStr;
}

// find all Transaction
exports.findAll = (req, res) => {
    // find by date desc
    Transaction.find({})
        .sort({ date: -1 })
        // Transaction.find()
        .then((response) => {
            res.send(response);
        })
        .catch((err) => {
            res.status(500).send({
                status: false,
                message: err.message || "Some error occurred while retrieving jobs.",
            });
        });
};

exports.findByDateRange = async (req, res) => {
    let fromDate = req.body.fromDate ? req.body.fromDate : new Date();
    let toDate = req.body.toDate
        ? req.body.toDate
        : new Date(Date.parse(new Date()) + 604800000);
    fromDate = getFormattedDate(new Date(fromDate));
    toDate = getFormattedDate(new Date(toDate));

    fromDate = fromDate + " 00:00:00";
    toDate = toDate + " 23:59:59";

    let dayOnFromDate = new Date(fromDate);
    dayOnFromDate = dayOnFromDate.toDateString().split(" ")[0];
    let resultArr = [];

    let parsedfromDate = Date.parse(fromDate);
    let parsedEndDate = Date.parse(toDate);

    let totalTime = parsedEndDate - parsedfromDate;

    let fixedTimeGap = totalTime / 7;

    for (let i = 0; i < 7; i++) {
        let newStartDate = new Date(parsedfromDate);
        let newEndDate = new Date(parsedfromDate + fixedTimeGap);
        await Transaction.find({
            date: { $gte: newStartDate.toISOString(), $lte: newEndDate.toISOString() },
        })
            .sort({ date: 1 })
            .then((users) => {
                let amount = 0
                for (let j = 0; j < users.length; j++) {
                    amount += users[j].amount
                }
                resultArr.push({
                    value: amount,
                    time: newEndDate.getDate() + "/" + (+newEndDate.getMonth() + 1),
                });
                parsedfromDate += fixedTimeGap;
                // let newUsers = [];
                // for (let i = 0; i < users.length; i++) {
                //   let dayUser = new Date(users[i].date);
                //   dayUser = dayUser.toDateString().split(' ')[0];
                //   newUsers[i] = [dayUser, users[i].amount];
                // }
                // // count how many each key is in newUsers array
                // let result = {};
                // newUsers.forEach(day => {
                //   if (result[day[0]]) {
                //     result[day[0]] += day[1];
                //   } else {
                //     result[day[0]] = day[1];
                //   }
                // });

                // const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                // const startIndex = daysOfWeek.indexOf(dayOnFromDate);
                // const newDaysOfWeek = daysOfWeek.slice(startIndex).concat(daysOfWeek.slice(0, startIndex));

                // // transfer the values of result object to newDaysOfWeek values but don't change the keys
                // // if there is no value for a key in result object, set it to 0
                // let finalResult = {};
                // newDaysOfWeek.forEach(day => {
                //   if (result[day]) {
                //     finalResult[day] = result[day];
                //   } else {
                //     finalResult[day] = 0;
                //   }
                // });

                // res.send(JSON.stringify(finalResult));
            })
            .catch((err) => {
                res.status(500).send({
                    status: false,
                    message: err.message || "Some error occurred while retrieving users.",
                });
            });
    }
    setTimeout(() => {
        res.send(JSON.stringify(resultArr));
    }, 2000);
};

// find all Transaction
// exports.findAllTransaction = (req, res) => {
//   // find by date desc
//   if(!req.body.userId) {
//     res.status(500).send({
//       status : false,
//       message : "Please provide User Id"
//     })
//     return;
//   }
//   let query = {userId : req.body.userId}
//   if(req.body.startDate) {
//     query["date"] = { $gte: req.body.startDate }  
//   }
//   if(req.body.endDate) {
//     query["date"] = { $lte: req.body.endDate }
//   }
//   if(req.body.startDate && req.body.endDate) {
//     query["date"] = { $gte: req.body.startDate, $lte: req.body.endDate }
//   }
//   Transaction.find(query)
//     // .sort({ date: -1 })
//     .then((response) => {
//       res.send({transaction : response, status : true, total : response.length});
//     })
//     .catch((err) => {
//       res.status(500).send({
//         status : false,
//         message: err.message || "Some error occurred while retrieving Transactions.",
//       });
//     });
// };

//find all transaction for the particular user with pagination and date
exports.findAllTransaction = (req, res) => {
    if (!req.body.userId) {
        res.status(500).send({
            status: false,
            message: "Please provide User Id",
        });
        return;
    }

    const { userId, startDate, endDate, userType, page = 1, limit = 10 } = req.body;
    const skip = (page - 1) * limit;

    let query = { personId: userId };

    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            query.date.$gte = startDate;
        }
        if (endDate) {
            query.date.$lte = endDate;
        }
    }

    if (userType) {
        query.userType = userType;
    }

    Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .then((response) => {
            const totalPages = Math.ceil(response.length / limit);
            res.send({
                transaction: response,
                status: true,
                total: response.length,
                currentPage: page,
                totalPages: totalPages,
            });
        })
        .catch((err) => {
            res.status(500).send({
                status: false,
                message: err.message || "Some error occurred while retrieving Transactions.",
            });
        });
};

exports.allTransactionsList = async (req, res) => {
    const pageSize = req.body.pageSize || 20;
    const pageNumber = req.body.pageNumber || 1;
    const skip = (pageNumber - 1) * pageSize;
    const sortField = req.body.sortField || "date";
    const sortOrder = req.body.sortOrder || "desc";
    const search = req.body.search || "";

    const sort = {};
    sort[sortField] = sortOrder === "asc" ? 1 : -1;

    let conditions = { transactionId: { $regex: search, $options: "i" } };

    if (req.body.transactionType) {
        conditions.transactionType = req.body.transactionType;
    }

    try {
        let transactions = await Transaction.find(conditions).sort(sort).skip(skip).limit(pageSize).populate('personId');
        let count = await Transaction.countDocuments(conditions);

        return res.status(200).send({
            status: true,
            count: count,
            transactions: transactions
        });
    } catch (error) {
        console.log('Error while fetching transactions:', error.message);

        return res.status(500).send({
            status: false,
            message: 'Error while fetching transactions'
        });
    }
}

exports.findTransactionById = async (req, res) => {
    try {
        let data = await Transaction.findById(req.body._id).populate("personId");

        res.send({ data: data, status: true });
    } catch (err) {
        console.log("Error while fetching transaction data:", err);

        return res.status(500).send({
            status: false,
            message: "Error while fetching transaction data",
        });
    }
}

exports.generateReport = async (req, res) => {
    let fromDate = req.body.selectedStartDate;
    let toDate = req.body.selectedEndDate;

    const workbook = new ExcelJS.Workbook();
    const transSheet = workbook.addWorksheet("Transactions");

    let transConditions = {
        date: { $gte: fromDate, $lte: toDate },
    };

    if (req.body.transactionType == 'incoming') {
        transConditions.$or = [
            { transactionType: 'job' },
            { transactionType: 'sub' }
        ];
    } else {
        transConditions.transactionType = 'payout';
    }

    try {
        const transactions = await Transaction.find(transConditions).populate('personId');

        const columns = [
            { header: "Person Name", key: "personId" },
            { header: "Date of Transaction", key: "date" },
            { header: "Transaction ID", key: "transactionId" },
            { header: "Amount", key: "originalAmount" },
            { header: "Commission", key: "commissionAmount" },
            { header: "Total", key: "finalAmount" },
            { header: "User Type", key: "userType" },
            { header: "Transaction Type", key: "transactionType" },
        ];

        transSheet.columns = columns;

        for (const transaction of transactions) {
            const person = await User.findOne({ _id: transaction.personId });
            let formattedDate = new Date(transaction.date).toLocaleString('en-US');

            const flattenedTransaction = {
                personId: `${person.firstName} ${person.lastName}`,
                date: formattedDate,
                transactionId: transaction.transactionId,
                originalAmount: transaction.originalAmount,
                commissionAmount: transaction.commissionAmount,
                finalAmount: transaction.finalAmount,
                userType: transaction.userType,
                transactionType: transaction.transactionType,
            };

            transSheet.addRow(flattenedTransaction);
        }

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=transactions-export.xlsx'
        );

        try {
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error writing Excel workbook:', error.message);
            res.status(500).send('Internal Server Error');
        }
    } catch (error) {
        console.error("Error exporting data to Excel:", error);
        res.status(500).send({
            status: false,
            message: "Error exporting data to Excel",
        });
    }
};