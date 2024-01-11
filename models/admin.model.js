import { ObjectId } from "mongodb";
import mongoose from "mongoose";

export const Admin = new mongoose.model("Admin", new mongoose.Schema({
    userName: { type: String, required: true },
    password: { type: String, },
    tokens: { ResetPassword: { type: String } },
    roles: [{
        role: { type: String, required: true },
        permission: [{ type: String, default: '' }]
    }],
    balance: { type: Number, default: 0 },
    depositBalance: { type: Number, default: 0 },
    lastLoginTime: { type: Date },
    ip: {
        IP: { type: String },
        country: { type: String },
        region: { type: String },
        timezone: { type: String }
    },
    transferAmount: [
        {
            withdraw: { type: Number,  default: 0},
            amount: { type: Number, default: 0 },
            userName: { type: String },
            date: { type: Date },
            transactionType: { type: String },
            remarks: { type: String },
            From: { type: String },
            To: { type: String },
            debitBalance: { type: Number, default: 0 },
        }
    ],
    selfTransaction: [
        {
            amount: { type: Number, default: 0 },
            userName: { type: String },
            date: { type: Date },
            transactionType: { type: String },
            remarks: { type: String },
        }
    ],
    loadBalance: { type: Number, default: 0 },
   
    creditRef: [
        {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
        },
    ],
  
    partnership: [
        {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
        },
    ],

    createBy: { type: ObjectId },
    createUser: { type: String},
    isActive: { type: Boolean, default: true, required: true },
    locked: { type: Boolean, default: true, require: true },
    hyperActive: { type: Boolean, default: false, required: false },
    masterActive: { type: Boolean, default: false, required: false },
    superActive: { type: Boolean, default: false, required: false },
    whiteActive: { type: Boolean, default: false, required: false },
    subhyperActive: { type: Boolean, default: false, required: false },
    submasterActive: { type: Boolean, default: false, required: false },
    subsuperActive: { type: Boolean, default: false, required: false },
    subwhiteActive: { type: Boolean, default: false, required: false },
    checkActive: { type: Boolean, default: false, required: false },
    Path:[{ type: String}],


}), 'Admin');