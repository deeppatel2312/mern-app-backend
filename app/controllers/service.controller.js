const db = require("../models");
const Service = db.service;
var bcrypt = require("bcryptjs");
const multer = require("multer");
const ProviderService = require("../models/providerService.model");

// the date format is ISO 8601
// i want to split the date at T, so i can get the date and time separately
// this is a function to accept the date and return the date in YYYY-MM-DD format
function getFormattedDate(date) {
  let dateStr = date.toISOString().split("T")[0];
  return dateStr;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // upload them to public folder
    cb(null, "./public/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// make a function to count all services with status 1
exports.countAll = (req, res) => {
  Service.countDocuments({ status: 1 })
    .then((count) => {
      res.send(JSON.stringify(count));
    })
    .catch((err) => {
      res.status(500).send({
        status : false,
        message:
          err.message || "Some error occurred while retrieving services.",
      });
    });
};

exports.findAll = async (req, res) => {
  const pageSize = req.body.pageSize || 1;
  const pageNumber = req.body.pageNumber || 1;
  const skip = (pageNumber - 1) * pageSize;
  const sortField = req.body.sortField || "name";
  const sortOrder = req.body.sortOrder || "desc";
  const search = req.body.search || "";

  const sort = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;

  Service.find({
    $or: [{ name: { $regex: search, $options: "i" } }],
  })
    .sort(sort)
    // .skip(skip)
    // .limit(pageSize)
    .then((services) => {
      // Service.countDocuments({
      //   $or: [{ name: { $regex: search, $options: "i" } }],
      // })
      //   .then((count) => {
          let parentList = [];
          services.map((ele) => {
            if (!ele.parent) {
              parentList.push({
                children: [],
                _id: ele._id,
                name: ele.name,
                description: ele.description,
                image: ele.image,
                isActive: ele.isActive,
              });
            }
          });
          for (let i = 0; i < parentList.length; i++) {
              for (let j = 0; j < services.length; j++) {
              if (parentList[i]._id.equals(services[j].parent)) {
                parentList[i].children.push(services[j]);
              }
            }
          }
          let totalCount = parentList.length
          parentList = parentList.slice(skip, skip+pageSize)
          res.send({ services:parentList, count:totalCount, status : true, });
        // })
        // .catch((err) => {
        //   res.status(500).send({
        //     message:
        //       err.message || "Some error occurred while retrieving services.",
        //   });
        // });
    })
    .catch((err) => {
      res.status(500).send({
        status : false,
        message:
          err.message || "Some error occurred while retrieving services.",
      });
    });
};

// Find Record by ID
exports.findById = (req, res) => {
  const id = req.body.id;

  Service.find({ _id: id })
    .then((data) => {
      // console.log(data)
      res.send(JSON.stringify(data[0]));
    })
    .catch((err) => {
      res.status(500).send({
        status : false,
        message:
          err.message || "Some error occurred while retrieving services.",
      });
    });
};

// Delete Record by ID
exports.deleteById = async (req, res) => {
  const data = req.body;
  console.log(data)
  await data.map((id) => {
    Service.deleteOne({ _id: id })
      .then((data) => {
        console.log(data);
      })
      .catch((err) => {
        res.status(500).send({
          status : false,
          message:
          err.message || "Some error occurred while retrieving services.",
        });
      });
    })
    res.send({message : "Data Deleted", status : true,});
  };

// Update Record by ID
exports.update = (req, res) => {
  // console.log(req.body);
  // if(req.file) {
  //   req.body['image'] = req.file.filename
  // }
  req.body.updatedAt = new Date().toISOString()
  Service.updateOne({ _id: req.body._id }, req.body)
    .then((data) => {
      // console.log(data);
      res.send({status : true, message: "Data successfully updated"});
    })
    .catch((err) => {
      res.status(500).send({
        status : false,
        message:
          err.message || "Some error occurred while retrieving services.",
      });
    });
};

// Update Record by ID
exports.create = (req, res) => {
  // console.log(req.body)
  // req.body.password = bcrypt.hashSync(req.body.password, 8),
  if(req.files.image) {
    req.body['image'] = req.files.image[0].filename
  }
  req.body.createdAt = new Date().toISOString()
  req.body.updatedAt = new Date().toISOString()
  Service.insertMany([req.body])
    .then((data) => {
      console.log(data);
      res.send(JSON.stringify(data));
    })
    .catch((err) => {
      res.status(500).send({
        status : false,
        message:
          err.message || "Some error occurred while retrieving services.",
      });
    });
};

exports.getAllService = async (req, res) => {
  ProviderService.find({serviceId : req.body.serviceId})
    .then((services) => {
      res.send({ data: services, status: true });
    })
    .catch((err) => {
      res.status(500).send({
        status: false,
        message:
          err.message || "Some error occurred while retrieving services.",
      });
    });
};