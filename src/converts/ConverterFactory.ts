import BaseConverter, { TableType } from './BaseConverter';
import { MySQL } from 'x-mysql-ssh';
import CSharpConverter from './CSharpConverter';
import TsConverter from './TsConverter';

class NoneConverter extends BaseConverter {
    private dbName: string;
    private mysql: MySQL;

    public constructor(mysql: MySQL, dbName: string) {
        super();
        this.mysql = mysql;
        this.dbName = dbName;
    }
    public async convert(table: TableType, namespace: string) {
        return '不支持';
    }
}
export default class ConverterFactory {
    public static Create(language: 'TS' | 'CSharp', mysql: MySQL, dbName: string): BaseConverter {
        switch (language) {
            case 'CSharp':
                return new CSharpConverter(mysql, dbName);
            case 'TS':
                return new TsConverter(mysql, dbName);
        }
        return new NoneConverter(mysql, dbName);
    }
}