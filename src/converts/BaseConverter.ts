import { MySQL, fixCatch } from 'x-mysql-ssh';

export type ColumnType = {
    COLUMN_NAME: string,
    /**
     * 默认值
     */
    COLUMN_DEFAULT: string,
    /**
     * 是否可空 YES、NO
     */
    IS_NULLABLE: string,
    DATA_TYPE: string,
    COLUMN_TYPE: string,
    COLUMN_COMMENT: string,
    IsRequired: boolean,
    EXTRA:string,
    IsAutoIncrement:boolean,
}
export type StatisticsType = {
    TABLE_SCHEMA: string,
    TABLE_NAME: string,
    INDEX_NAME: string,
    COLUMN_NAME: string,
    COMMENT: string,
}
export type ConstraintType = {
    CONSTRAINT_NAME: string,
    TABLE_SCHEMA: string,
    TABLE_NAME: string,
    COLUMN_NAME: string,
    ORDINAL_POSITION: number,
    POSITION_IN_UNIQUE_CONSTRAINT: number,
    REFERENCED_TABLE_SCHEMA: string,
    REFERENCED_TABLE_NAME: string,
    REFERENCED_COLUMN_NAME: string,
    IsPrimary: boolean;//CONSTRAINT_NAME=='PRIMARY'
}
export type TableType = {
    TABLE_NAME: string,
    TABLE_TYPE: string,
    TABLE_COMMENT: string,
}
export type ParamType = { name: string, comment: string };
export default abstract class BaseConverter {
    public abstract async convert(table: TableType, namespace: string):Promise<string>;
    protected async getStatistics(mysql: MySQL, dbName: string, table: TableType): Promise<StatisticsType[]> {
        const result = await mysql.query(
            'SELECT * '
            + ' FROM ?? '
            + ' WHERE TABLE_SCHEMA=? AND TABLE_NAME = ?',
            'information_schema.STATISTICS', //TABLE
            dbName, table.TABLE_NAME).catch(fixCatch);
        if (result.Success) {
            return result.Result.map(item => ({
                ...item,
            }));
        } else {
            console.log(result.Err);
            return [];
        }
    }
    protected async getConstraint(mysql: MySQL, dbName: string, table: TableType): Promise<ConstraintType[]> {
        const result = await mysql.query(
            'SELECT * '
            + ' FROM ?? '
            + ' WHERE TABLE_SCHEMA=? AND TABLE_NAME = ?',
            'information_schema.KEY_COLUMN_USAGE', //TABLE
            dbName, table.TABLE_NAME).catch(fixCatch);
        if (result.Success) {
            return result.Result.map(item => ({
                ...item,
                IsPrimary: item.CONSTRAINT_NAME === 'PRIMARY'
            }));
        } else {
            console.log(result.Err);
            return [];
        }
    }
    protected async getColumnList(mysql: MySQL, dbName: string, table: TableType): Promise<ColumnType[]> {
        const result = await mysql.query(
            'SELECT COLUMN_NAME, COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,COLUMN_TYPE,COLUMN_COMMENT,EXTRA FROM ?? WHERE TABLE_SCHEMA LIKE ? AND TABLE_NAME LIKE ?',
            'information_schema.COLUMNS', //TABLE
            dbName, table.TABLE_NAME).catch(fixCatch);
        if (result.Success) {
            return result.Result.map(column => ({
                ...column,
                IsRequired: column.IS_NULLABLE === 'NO',
                IsAutoIncrement: column.EXTRA != null && column.EXTRA.includes('auto_increment'),
            }));
        } else {
            console.log(result.Err);
        }
        return [];
    }
    protected getTab(count: number) {
        return ''.padEnd(count * 4, ' ');
    }
    protected getSummary(txt: string, tab: number) {
        const tabs = this.getTab(tab);
        return [
            `${tabs}/// <summary>`,
            txt.split('\n').map((s: string) => `${tabs}/// ${s}`).join('\n'),
            `${tabs}/// </summary>`
        ];
    }
    protected getSummaryByParams(txt: string, params: ParamType[], tab: number) {
        const tabs = this.getTab(tab);
        return [
            `${tabs}/// <summary>`,
            txt.split('\n').map((s: string) => `${tabs}/// ${s}`).join('\n'),
            `${tabs}/// </summary>`,
            ...params.map(p => `${tabs}/// <param name="${p.name}">${p.comment}</param>`),
        ];
    }
}