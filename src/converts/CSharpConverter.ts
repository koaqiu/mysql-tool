import BaseConverter, { TableType, ColumnType, ConstraintType, StatisticsType } from './BaseConverter';
import { MySQL } from 'x-mysql-ssh';

function getDf(type:string, value:string) {
    switch (type) {
        case 'int':
            return value;
        case 'decimal':
            return `${value}m`;
        case 'string':
            return `"${value}"`;
        case 'DateTime':
            //type = 'DateTime'
            throw new Error(`${type},${value}`);
        case 'bool':
            return value === "b'1'";
        default:
            return value;
    }
}
export default class CSharpConverter extends BaseConverter {
    private dbName: string;
    private mysql: MySQL;

    public constructor(mysql: MySQL, dbName: string) {
        super();
        this.mysql = mysql;
        this.dbName = dbName;
    }
    public async convert(table: TableType, namespace: string) {
        const columnList = await this.getColumnList(this.mysql, this.dbName, table);
        const constraintList = await this.getConstraint(this.mysql, this.dbName, table);
        const statisticsList = await this.getStatistics(this.mysql, this.dbName, table);
        const tabs = this.getTab(1);
        let s: string[] = [];
        s.push('using System;');
        s.push('using Microsoft.EntityFrameworkCore;');
        s.push(`namespace ${namespace} {`);
        s.push(...this.getSummary(table.TABLE_COMMENT, 1));
        s.push(`${tabs}public class ${table.TABLE_NAME.toUpperCase()} {`)
        s.push(...this.getProperties(columnList));
        s.push('');
        s.push(...this.ModelCreating(table.TABLE_NAME, columnList, constraintList, statisticsList));
        s.push(`${tabs}}`);
        s.push('}');
        return s.join('\n');
    }
    private getProperties(columnList: ColumnType[]) {
        const tabs = this.getTab(2);
        var s: string[] = [];
        columnList.forEach(column => {
            let type = '';
            switch (column.DATA_TYPE) {
                case 'int':
                case 'tinyint':
                //case 'float':
                    type = 'int';
                    break;
                case 'text':
                case 'mediumtext':
                case 'varchar':
                    type = 'string';
                    break;
                case 'datetime':
                    type = 'DateTime'
                    break;
                case 'bit':
                    type = 'bool'
                    break;
                default:
                    type = column.DATA_TYPE;
                    break;
            }

            s.push(...this.getSummary(column.COLUMN_COMMENT, 2));
            const isNullable = column.IS_NULLABLE === 'YES' && type !== 'string';
            if (typeof (column.COLUMN_DEFAULT) === 'string' && column.COLUMN_DEFAULT !== 'CURRENT_TIMESTAMP') {
                s.push(`${tabs}public ${type}${isNullable ? '?' : ''} ${column.COLUMN_NAME} { get; set; } = ${getDf(type, column.COLUMN_DEFAULT)};`);
            } else {
                s.push(`${tabs}public ${type}${isNullable ? '?' : ''} ${column.COLUMN_NAME} { get; set; }`);
            }
            s.push('');
        });
        return s;
    }
    private ModelCreating(tableName: string, columnList: ColumnType[], constraintList: ConstraintType[], statisticsList: StatisticsType[]) {
        const tabs2 = this.getTab(2);
        const tabs3 = this.getTab(3);
        const tabs4 = this.getTab(4);
        const tabs5 = this.getTab(5);
        let s: string[] = [];
        s.push(...this.getSummaryByParams('DbContext.OnModelCreating',[{name:'modelBuilder', comment:''}], 2));
        s.push(`${tabs2}public static void ModelCreating(ModelBuilder modelBuilder) {`);
        s.push(`${tabs3}modelBuilder.Entity<${tableName.toUpperCase()}>(entity => {`);
        const key = constraintList.filter(ii => ii.IsPrimary).pop();
        if (key !== undefined) {
            s.push(`${tabs4}entity.HasKey(e => e.${key.COLUMN_NAME});`);
            s.push('');
        }
        statisticsList.filter(s => s.INDEX_NAME !== 'PRIMARY').forEach(statistics => {
            s.push(`${tabs4}entity.HasIndex(e => e.${statistics.COLUMN_NAME})`);
            s.push(`${tabs5}.HasName("${statistics.INDEX_NAME}");${statistics.COMMENT ? (`// ${statistics.COMMENT}`) : ''}`);
            s.push('');
        });
        columnList.forEach(column => {
            s.push(`${tabs4}entity.Property(e => e.${column.COLUMN_NAME})`);
            if (column.IsRequired) {
                s.push(`${tabs5}.IsRequired()`);
            }
            s.push(`${tabs5}.HasColumnType("${column.COLUMN_TYPE}")`);
            if (typeof (column.COLUMN_DEFAULT) === 'string' && column.COLUMN_DEFAULT !== 'CURRENT_TIMESTAMP') {
                s.push(`${tabs5}.HasDefaultValueSql("'${column.COLUMN_DEFAULT}'");`);
            } else {
                s[s.length - 1] += ';';
            }
            s.push('');
        });
        s.push(`${tabs3}});`);
        s.push(`${tabs2}}`);
        return s;
    }
}