import { Authorize } from '../middleware/auth.js';
import customErrorHandler from '../helper/customErrorHandler.js';
import { } from '../schema/commonSchema.js';
import { userCreateColorGame } from '../controller/colorGameUser.controller.js';
import { string } from '../constructor/string.js';


export const colorGameUserRoute = (app) => {

    app.post('/api/admin/create-user-colorGame', customErrorHandler,  
        Authorize([
        string.superAdmin,
        string.whiteLabel,
        string.hyperAgent,
        string.superAgent,
        string.masterAgent
      ]), userCreateColorGame);

  }