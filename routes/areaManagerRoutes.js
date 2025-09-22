const express = require("express");
const router = express.Router();



const upload = require("../utils/multer");
const { registerAreaManager, getAreaManagers, getAreaManager, deleteAreaManager, updateAreaManager } = require("../controllers/areaManagerController");

router.post("/register", upload.single("signature"), registerAreaManager);


router.route("/").get(getAreaManagers);

router.route("/:id").get(getAreaManager).delete(deleteAreaManager);

router.put("/:id", upload.single("signature"), updateAreaManager);


module.exports = router;
