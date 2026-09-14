require("dotenv").config();

const db = require("./db");
const { initSchema } = require("./schema");

(async()=>{
  try{
    await db.query("SELECT 1 AS ok");
    console.log("POSTGRES_CONNECTION_OK");

    await initSchema();
    console.log("POSTGRES_SCHEMA_OK");

    const result = await db.query("SELECT COUNT(*)::int AS count FROM users");
    console.log("POSTGRES_USER_COUNT",result.rows[0].count);
  }catch(error){
    console.error("POSTGRES_TEST_FAILED",error.code||"NO_CODE",error.message||"NO_MESSAGE");
    process.exitCode=1;
  }finally{
    await db.close();
  }
})();
