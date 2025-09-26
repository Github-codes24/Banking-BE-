const express = require("express");
const router = express.Router();



const upload = require("../utils/multer");
const { registerAreaManager, getAreaManagers, getAreaManager, deleteAreaManager, updateAreaManager } = require("../controllers/areaManagerController");
const { authCheck } = require("../middilewares/authCheck");

router.post("/register",authCheck, upload.single("signature"), registerAreaManager);


router.route("/",authCheck).get(getAreaManagers);

router.route("/:id",authCheck).get(getAreaManager).delete(deleteAreaManager);

router.put("/:id",authCheck, upload.single("signature"), updateAreaManager);


module.exports = router;
