import { Authorize } from '../middleware/auth.js';
import customErrorHandler from '../helper/customErrorHandler.js';
import { createdUserSchema, sendBalanceSchema } from '../schema/commonSchema.js';
import { userCreateColorGame, viewColorGameUser, addBalanceToColorGameUser, userGame, getUserBetHistory } from '../controller/colorGameUser.controller.js';
import { string } from '../constructor/string.js';


export const colorGameUserRoute = (app) => {

    app.post('/api/admin/create-user-colorGame', createdUserSchema, customErrorHandler,  
        Authorize([
        string.superAdmin,
        string.whiteLabel,
        string.hyperAgent,
        string.superAgent,
        string.masterAgent
      ]), userCreateColorGame);
    
    app.get('/api/admin/view-colorGame-user', customErrorHandler, 
        Authorize([
        string.superAdmin,
        string.whiteLabel,
        string.hyperAgent,
        string.superAgent,
        string.masterAgent
      ]), viewColorGameUser)

  app.post('/api/admin/add-balance-to-colorGame-user', sendBalanceSchema, customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent
    ]), addBalanceToColorGameUser)


  app.get('/api/user-colorGame-games', userGame);

  app.get('/api/user-colorGame-betHistory/:userName/:gameId',getUserBetHistory);
}