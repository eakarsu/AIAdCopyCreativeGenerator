'use strict';
const pool=require('../src/db');
const {provisionNativeAccount}=require('../src/services/runtimeProvisioning');
async function main(){try{await provisionNativeAccount(pool);console.log('Configured administrator is ready. Existing account preserved.');}finally{await pool.end();}}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main};
