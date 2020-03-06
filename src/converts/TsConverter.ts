import BaseConverter, { TableType } from './BaseConverter';
import { MySQL } from 'x-mysql-ssh';

export default class TsConverter extends BaseConverter {
    private dbName: string;
    private mysql: MySQL;

    public constructor(mysql: MySQL, dbName: string) {
        super();
        this.mysql = mysql;
        this.dbName = dbName;
    }
    public async convert(table: TableType, namespace: string) {
        const columnList = await this.getColumnList(this.mysql, this.dbName, table);
        return `export interface I${table.TABLE_NAME}{\n` +
        columnList.map(field => {
            let type = '';
            switch (field.DATA_TYPE) {
                case 'int':
                case 'tinyint':
                case 'float':
                    type = 'number';
                    break;
                case 'text':
                case 'mediumtext':
                case 'varchar':
                    type = 'string';
                    break;
                case 'datetime':
                    type = 'Date'
                    break;
                case 'bit':
                    type = 'boolean'
                    break;
                default:
                    type = field.DATA_TYPE;
                    break;
            }
            return `    /**
${field.COLUMN_COMMENT.split('\n').map((s: string) => `    * ${s}`).join('\n')}
    */
    ${field.COLUMN_NAME}:${type};`;
        }).join('\n')
        + '\n}\n';
    }
}