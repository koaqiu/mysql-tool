
import { MySQL, fixCatch, } from 'x-mysql-ssh';
import Commander from 'x-command-parser';
import connectMysql, { getDbConfig } from './dbConfig';
import { TableType } from './converts/BaseConverter';
import FS from 'fs';
import { GetPath } from './config';
import ConverterFactory from './converts/ConverterFactory';

async function getTable(mysql: MySQL, tableName: string[], dbName: string): Promise<TableType[]> {
    const result = await mysql.query(
        'SELECT TABLE_NAME, TABLE_TYPE, TABLE_COMMENT FROM ?? WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)',
        'information_schema.TABLES', //TABLE
        dbName, tableName).catch(fixCatch);
    if (result.Success) {
        return result.Result;
    } else {
        console.log(result.Err);
        return [];
    }
}

export default async function Main(args: string[]) {
    const command = new Commander(true)
        .addParam({
            name: 'env',
            alias: 'E',
            type: 'enum',
            comment: '工作环境',
            default: 'SIT',
            list: ['SIT', 'PRD']
        })
        .addParam({
            name: 'ssh',
            type: 'boolean',
            comment: '是否使用SSH通道',
            default: false,
        })
        .addParam({
            name: 'language',
            type: 'enum',
            comment: '语言',
            default: 'CSharp',
            list: ['TS', 'CSharp'],
        })
        .addParam({
            name: 'out',
            type: 'string',
            comment: '输出路径',
            default: process.cwd()
        })
        .addParam({
            name: 'ns',
            type: 'string',
            comment: '命名空间（namespace）',
            default: 'database'
        })
        .parse(args);
    console.log('工作环境：', command.Options['env']);
    if (command.Options['ssh'] === true) {
        console.log('使用SSH通道');
    }
    const dbConfig = getDbConfig(command.Options['env'], 'B2B');
    const mysql = await connectMysql(command.Options['env'], 'B2B', command.Options['ssh'] === true);
    if (mysql == null) return 2;
    const tables = await getTable(mysql, command.Args, dbConfig.database);
    const converter = ConverterFactory.Create(command.Options['language'], mysql, dbConfig.database);
    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const s = await converter.convert(table, command.Options['ns']);
        const csFile = GetPath(command.Options['out'], `${table.TABLE_NAME.toUpperCase()}.cs`);
        FS.writeFileSync(csFile, s);
        console.log(csFile);
    }
    mysql.close();
    return 0;
}
const isMain = module.parent === null;
if (isMain) {
    Main(process.argv.slice(2)).then(process.exit).catch((err) => {
        console.log(err);
        process.exit(1);
    });
}