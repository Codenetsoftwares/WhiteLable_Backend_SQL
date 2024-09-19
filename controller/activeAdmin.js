import { Op, Sequelize } from "sequelize";
import { string } from "../constructor/string.js";
import admins from "../models/admin.model.js";
import CustomError from "../helper/extendError.js";

export const activateAdmin = async (adminId, isActive, locked) => {
  try {
    console.log("adminId:", adminId);

    const admin = await admins.findOne({ where: { adminId } });

    const whiteLabel = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.whiteLabel}"}')`)
      }
    });

    const hyperAgent = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.hyperAgent}"}')`)
      }
    });

    const masterAgent = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.masterAgent}"}')`)
      }
    });

    const superAgent = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.superAgent}"}')`)
      }
    });

    const subWhiteLabel = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.subWhiteLabel}"}')`)
      }
    });

    const subHyperAgent = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.subHyperAgent}"}')`)
      }
    });

    const subMasterAgent = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.subMasterAgent}"}')`)
      }
    });

    const subSuperAgent = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.subSuperAgent}"}')`)
      }
    });

    const subAdmin = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.subAdmin}"}')`)
      }
    });

    const user = await admins.findAll({
      where: {
        createdById: adminId,
        [Op.and]: Sequelize.literal(`JSON_CONTAINS(roles, '{"role": "${string.user}"}')`)
      }
    });

    if (
      whiteLabel.length == 0 &&
      hyperAgent.length == 0 &&
      masterAgent.length == 0 &&
      superAgent.length == 0 &&
      subWhiteLabel.length == 0 &&
      subHyperAgent.length == 0 &&
      subMasterAgent.length == 0 &&
      subSuperAgent.length == 0 &&
      subAdmin.length === 0 &&
      user.length === 0
    ) {
      if (isActive === true) {
        admin.isActive = true;
        admin.locked = true;
      } else if (isActive === false) {
        if (locked === false) {
          admin.locked = false;
          admin.isActive = false;
        } else {
          admin.isActive = false;
          admin.locked = true;
        }
      }

      await admin.save();
      await Promise.all(hyperAgent.map((data) => data.save()));
      await Promise.all(masterAgent.map((data) => data.save()));
      await Promise.all(whiteLabel.map((data) => data.save()));
      await Promise.all(superAgent.map((data) => data.save()));
      await Promise.all(subHyperAgent.map((data) => data.save()));
      await Promise.all(subMasterAgent.map((data) => data.save()));
      await Promise.all(subWhiteLabel.map((data) => data.save()));
      await Promise.all(subSuperAgent.map((data) => data.save()));
      await Promise.all(subAdmin.map((data) => data.save()));
      await Promise.all(user.map((data) => data.save()));

      return;
    }
    if (!admin) {
      throw new CustomError("Admin not found", null, statusCode.badRequest);
    }
    if (isActive === true) {
      admin.isActive = true;
      admin.locked = true;
      superAgent.map((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.superActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.superActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.superActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.superActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.superActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.superActive = false;
          data.checkActive = false;
        } //checked
        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      hyperAgent.forEach((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.hyperActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.hyperActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.hyperActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.hyperActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.hyperActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.hyperActive = false;
          data.checkActive = false;
        } //checked

        activateAdmin(data.adminId, data.isActive, data.locked);
      });
      
      masterAgent.forEach((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.masterActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.masterActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.masterActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.masterActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.masterActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.masterActive = false;
          data.checkActive = false;
        } //checked

        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      whiteLabel.forEach((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.whiteActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.whiteActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.whiteActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.whiteActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.whiteActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.whiteActive = false;
          data.checkActive = false;
        } //checked
        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      subAdmin.forEach((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.subAdminActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subAdminActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.subAdminActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.subAdminActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.subAdminActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subAdminActive = false;
          data.checkActive = false;
        } //checked
        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      subSuperAgent.map((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.subSuperActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subSuperActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.subSuperActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.subSuperActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.subSuperActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subSuperActive = false;
          data.checkActive = false;
        } //checked
        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      subHyperAgent.forEach((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.subHyperActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subHyperActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.subHyperActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.subHyperActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.subHyperActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subHyperActive = false;
          data.checkActive = false;
        } //checked

        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      subMasterAgent.forEach((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.subMasterActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subMasterActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.subMasterActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.subMasterActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.subMasterActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subMasterActive = false;
          data.checkActive = false;
        } //checked

        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      subWhiteLabel.forEach((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.subWhiteActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subWhiteActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.subWhiteActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.subWhiteActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.subWhiteActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.subWhiteActive = false;
          data.checkActive = false;
        } //checked
        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      user.forEach((data) => {
        if (
          data.isActive === false &&
          data.locked === false &&
          data.userActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.userActive = false;
          data.checkActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === false &&
          data.userActive === true &&
          data.checkActive === false
        ) {
          data.locked = true;
          data.userActive = false;
        } //checked
        else if (
          data.isActive === false &&
          data.locked === true &&
          data.userActive === true &&
          data.checkActive === true
        ) {
          data.isActive = true;
          data.locked = true;
          data.userActive = false;
          data.checkActive = false;
        } //checked
        activateAdmin(data.adminId, data.isActive, data.locked);
      });

      await admin.save();
      await Promise.all(hyperAgent.map((data) => data.save()));
      await Promise.all(masterAgent.map((data) => data.save()));
      await Promise.all(whiteLabel.map((data) => data.save()));
      await Promise.all(superAgent.map((data) => data.save()));
      await Promise.all(subHyperAgent.map((data) => data.save()));
      await Promise.all(subMasterAgent.map((data) => data.save()));
      await Promise.all(subWhiteLabel.map((data) => data.save()));
      await Promise.all(subSuperAgent.map((data) => data.save()));
      await Promise.all(subAdmin.map((data) => data.save()));
      await Promise.all(user.map((data) => data.save()));

      return { message: "Admin Activated Successfully" };
    } else if (isActive === false) {
      if (locked === false) {
        admin.locked = false;
        admin.isActive = false;

        superAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.superActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.superActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.superActive === true
          ) {
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.superActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.superActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.superActive === true &&
            data.checkActive === true
          ) {
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.superActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.superActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        hyperAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.hyperActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.hyperActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.hyperActive === true
          ) {
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.hyperActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.hyperActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.hyperActive === true &&
            data.checkActive === true
          ) {
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.hyperActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.hyperActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        masterAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.masterActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.masterActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.masterActive === true
          ) {
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.masterActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.masterActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.masterActive === true &&
            data.checkActive === true
          ) {
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.masterActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.masterActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        whiteLabel.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.whiteActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.whiteActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.whiteActive === true
          ) {
            ///not use
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.whiteActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.whiteActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.whiteActive === true &&
            data.checkActive === true
          ) {
            ///not use
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.whiteActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.whiteActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subAdmin.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subAdminActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.subAdminActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subAdminActive === true
          ) {
            ///not use
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.subAdminActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.subAdminActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subAdminActive === true &&
            data.checkActive === true
          ) {
            ///not use
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.subAdminActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.subAdminActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subSuperAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subSuperActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.subSuperActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subSuperActive === true
          ) {
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.superActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.subSuperActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subSuperActive === true &&
            data.checkActive === true
          ) {
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.subSuperActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.subSuperActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subHyperAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subHyperActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.subHyperActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subHyperActive === true
          ) {
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.subHyperActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.subHyperActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subHyperActive === true &&
            data.checkActive === true
          ) {
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.subHyperActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.subHyperActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subMasterAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subMasterActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.subMasterActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subMasterActive === true
          ) {
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.subMasterActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.subMasterActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subMasterActive === true &&
            data.checkActive === true
          ) {
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.subMasterActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.subMasterActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subWhiteLabel.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subWhiteActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.subWhiteActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subWhiteActive === true
          ) {
            ///not use
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.subWhiteActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.subWhiteActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.subWhiteActive === true &&
            data.checkActive === true
          ) {
            ///not use
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.subWhiteActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.subWhiteActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        user.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.userActive === false &&
            data.checkActive === false
          ) {
            data.isActive = false;
            data.locked = false;
            data.userActive = true;
            data.checkActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.userActive === true
          ) {
            data.isActive = false;
            data.locked = false;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === true &&
            data.userActive === false &&
            data.checkActive === false
          ) {
            data.locked = false;
            data.userActive = true;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === true &&
            data.userActive === true &&
            data.checkActive === true
          ) {
            data.locked = false;
          } //checked
          else if (
            data.isActive === false &&
            data.locked === false &&
            data.userActive === true &&
            data.checkActive === true
          ) {
            data.isActive = true;
            data.locked = true;
            data.userActive = false;
            data.checkActive === false;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        await admin.save();
        await Promise.all(hyperAgent.map((data) => data.save()));
        await Promise.all(masterAgent.map((data) => data.save()));
        await Promise.all(whiteLabel.map((data) => data.save()));
        await Promise.all(superAgent.map((data) => data.save()));
        await Promise.all(subHyperAgent.map((data) => data.save()));
        await Promise.all(subMasterAgent.map((data) => data.save()));
        await Promise.all(subWhiteLabel.map((data) => data.save()));
        await Promise.all(subSuperAgent.map((data) => data.save()));
        await Promise.all(subAdmin.map((data) => data.save()));
        await Promise.all(user.map((data) => data.save()));

        return { message: "Admin Locked Successfully" };
      } else {
        admin.isActive = false;
        admin.locked = true;
        superAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.superActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.superActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.superActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.superActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.superActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        hyperAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.hyperActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.hyperActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.hyperActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.hyperActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.hyperActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }

          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        masterAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.masterActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.masterActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.masterActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.masterActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.masterActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        whiteLabel.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.whiteActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.whiteActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.whiteActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.whiteActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.whiteActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subAdmin.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subAdminActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.subAdminActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subAdminActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.subAdminActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subAdminActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subSuperAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subSuperActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.subSuperActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subSuperActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.subSuperActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subSuperActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subHyperAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subHyperActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.subHyperActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subHyperActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.subHyperActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subHyperActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }

          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        subMasterAgent.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subMasterActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.subMasterActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subMasterActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.subMasterActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subMasterActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });
        
        subWhiteLabel.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.subWhiteActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.subWhiteActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subWhiteActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.subWhiteActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.subWhiteActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        user.forEach((data) => {
          if (
            data.isActive === true &&
            data.locked === true &&
            data.userActive === false
          ) {
            data.isActive = false;
            data.locked = true;
            data.userActive = true;
            data.checkActive = true;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.userActive === true &&
            data.checkActive === false
          ) {
            data.locked = true;
            data.userActive = false;
          } else if (
            data.isActive === false &&
            data.locked === false &&
            data.userActive === true &&
            data.checkActive === true
          ) {
            data.locked = true;
          }
          activateAdmin(data.adminId, data.isActive, data.locked);
        });

        await admin.save();
        await Promise.all(hyperAgent.map((data) => data.save()));
        await Promise.all(masterAgent.map((data) => data.save()));
        await Promise.all(whiteLabel.map((data) => data.save()));
        await Promise.all(superAgent.map((data) => data.save()));
        await Promise.all(subAdmin.map((data) => data.save()));
        await Promise.all(subHyperAgent.map((data) => data.save()));
        await Promise.all(subMasterAgent.map((data) => data.save()));
        await Promise.all(subWhiteLabel.map((data) => data.save()));
        await Promise.all(subSuperAgent.map((data) => data.save()));
        await Promise.all(user.map((data) => data.save()));

        return { message: "Admin Suspended Successfully" };
      }
    }
  } catch (error) {
    return res.status(statusCode.internalServerError).json(
      apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message),
    );
  }
};
