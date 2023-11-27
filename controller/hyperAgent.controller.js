// import bcrypt from "bcryptjs"

import { Admin } from "../models/admin.model.js";

export const HyperAgentController = {

// trasfer amount hyperagent to super agent

  transferAmounthyperAgent: async (hyperAgentUserName,SuperAgentUserName,trnsfAmnt) => {
    try {
        const hyperAgent = await Admin.findOne({ userName: hyperAgentUserName,roles: { $in: ["HyperAgent"]} }).exec();

        if (!hyperAgent) {
            throw { code: 404, message: "HyperAgent Not Found For Transfer" };
        }

        const superAgent = await Admin.findOne({ userName: SuperAgentUserName, roles: { $in: ["SuperAgent"] } }).exec();

        if (!superAgent) {
            throw { code: 404, message: "Super Agent Not Found" };
        }

        if (!hyperAgent.isActive) {
          throw { code: 401, message: 'hyperAgent is inactive' };
      }

      if (!superAgent.isActive) {
          throw { code: 401, message: 'superAgent is inactive' };
      }

        if (hyperAgent.balance < trnsfAmnt) {
            throw { code: 400, message: "Insufficient balance for the transfer" };
        }

        const transferRecordDebit = {
          transactionType:"Debit",
          amount: trnsfAmnt,
          userName: superAgent.userName,
          date: new Date().toLocaleDateString('en-GB')
      };

      const transferRecordCredit = {
          transactionType:"Credit",
          amount: trnsfAmnt,
          userName: hyperAgent.userName,
          date: new Date().toLocaleDateString('en-GB')
      };
      
        
      hyperAgent.balance -= trnsfAmnt;
      superAgent.balance += trnsfAmnt;
      superAgent.loadBalance += trnsfAmnt
      superAgent.creditRef += trnsfAmnt;
      hyperAgent.refProfitLoss = hyperAgent.creditRef - hyperAgent.balance ;

      if (!hyperAgent.transferAmount) {
        hyperAgent.transferAmount = [];
    }

    hyperAgent.transferAmount.push(transferRecordDebit); 
    superAgent.transferAmount.push(transferRecordCredit);

        await hyperAgent.save();
        await superAgent.save();

        return { message: "Balance Transfer Successfully" };
      } catch (err) {
        throw { code: err.code, message: err.message };
      }
},


}