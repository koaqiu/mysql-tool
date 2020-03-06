
import FS from 'fs';
import PATH from 'path';
import OS from 'os';
import sshMySql, { IDbConfig } from 'x-mysql-ssh';

const workPath = PATH.basename(__dirname) === 'out' ? PATH.dirname(__dirname) : __dirname;
function getPath(...paths:string[]){
    if(paths.length<1){
        return PATH.resolve();
    }
    if(paths[0]==='~'){
        paths[0] = OS.homedir();
    }
    return PATH.resolve(...paths);
}
const dbConfig_PRD = {
    WMS: {
        database: 'dpj_wms',
        user: 'depoga',
        password: 'deep#mysql%2019',
        port: 3306,
        host: 'rm-wz97mb4ar75v27x35.mysql.rds.aliyuncs.com'
    },
    B2B: {
        database: 'dpj_db',
        user: 'depoga',
        password: 'deep#mysql%2019',
        port: 3306,
        host: 'rm-wz97mb4ar75v27x35.mysql.rds.aliyuncs.com'
    }
};

const dbConfig_SIT = {
    WMS: {
        database: 'sit_wms',
        user: 'depoga',
        password: 'deep#mysql%2019',
        port: 3306,
        host: 'rm-wz97mb4ar75v27x35.mysql.rds.aliyuncs.com'
    },
    B2B: {
        database: 'dpj_sit',
        user: 'depoga_dev',
        password: '4ar75!v27',
        port: 3306,
        host: 'rm-wz97mb4ar75v27x35.mysql.rds.aliyuncs.com'
    }
};

const dbConfig: { [env: string]: { [prj: string]: IDbConfig } } = {
    "SIT": dbConfig_SIT,
    "PRD": dbConfig_PRD,
    // "LOC": dbConfig_LOC,
}
const sshConfig = {
    host: '120.79.192.182',
    port: 22,
    username: 'dev',
    privateKey: FS.readFileSync(getPath('~', '.ssh', 'dpj_dev_id_rsa'))
}
export function getDbConfig(env: string, prj: 'B2B'|'WMS'){
    return dbConfig[env][prj];
}
const connectMysql = async (env: string, prj: 'B2B'|'WMS', useSsh: boolean) =>
    sshMySql(dbConfig[env][prj], useSsh ? sshConfig : null).catch(err => null);

export default connectMysql;