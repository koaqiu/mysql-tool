import BaseConverter, {
  TableType,
  ColumnType,
  ConstraintType,
  StatisticsType,
} from "./BaseConverter";
import { MySQL } from "x-mysql-ssh";

function getDf(type: string, value: string) {
  switch (type) {
    case "int":
      return value;
    case "decimal":
      return `${value}m`;
    case "string":
      return `"${value}"`;
    case "DateTime":
      //type = 'DateTime'
      throw new Error(`${type},${value}`);
    case "bool":
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
    const constraintList = await this.getConstraint(
      this.mysql,
      this.dbName,
      table
    );
    const statisticsList = await this.getStatistics(
      this.mysql,
      this.dbName,
      table
    );
    const tabs = this.getTab(1);
    let s: string[] = [];
    s.push("using System;");
    s.push("using Microsoft.EntityFrameworkCore;");
    s.push(`namespace ${namespace} {`);
    s.push(...this.getSummary(table.TABLE_COMMENT, 1));
    s.push(`${tabs}public class ${table.TABLE_NAME.toUpperCase()} {`);
    s.push(...this.getProperties(columnList));
    s.push("");
    s.push(
      ...this.ModelCreating(
        table.TABLE_NAME,
        columnList,
        constraintList,
        statisticsList
      )
    );
    s.push(`${tabs}}`);
    s.push("}");
    return s.join("\n");
  }
  private getProperties(columnList: ColumnType[]) {
    const tabs = this.getTab(2);
    var s: string[] = [];
    columnList.forEach((column) => {
      let type = "";
      switch (column.DATA_TYPE) {
        case "int":
        case "tinyint":
          //case 'float':
          type = "int";
          break;
        case "json":
        case "text":
        case "mediumtext":
        case "varchar":
          type = "string";
          break;
        case "datetime":
          type = "DateTime";
          break;
        case "bit":
          type = "bool";
          break;
        default:
          type = column.DATA_TYPE;
          break;
      }

      s.push(...this.getSummary(column.COLUMN_COMMENT, 2));
      const isNullable = column.IS_NULLABLE === "YES" && type !== "string";
      if (
        typeof column.COLUMN_DEFAULT === "string" &&
        column.COLUMN_DEFAULT !== "CURRENT_TIMESTAMP"
      ) {
        s.push(
          `${tabs}public ${type}${isNullable ? "?" : ""} ${
            column.COLUMN_NAME
          } { get; set; } = ${getDf(type, column.COLUMN_DEFAULT)};`
        );
      } else {
        s.push(
          `${tabs}public ${type}${isNullable ? "?" : ""} ${
            column.COLUMN_NAME
          } { get; set; }`
        );
      }
      s.push("");
    });
    return s;
  }
  private ModelCreating(
    tableName: string,
    columnList: ColumnType[],
    constraintList: ConstraintType[],
    statisticsList: StatisticsType[]
  ) {
    const tabs2 = this.getTab(2);
    const tabs3 = this.getTab(3);
    const tabs4 = this.getTab(4);
    const tabs5 = this.getTab(5);
    let s: string[] = [];
    s.push(
      ...this.getSummaryByParams(
        "DbContext.OnModelCreating",
        [{ name: "modelBuilder", comment: "" }],
        2
      )
    );
    s.push(
      `${tabs2}public static void ModelCreating(ModelBuilder modelBuilder) {`
    );
    s.push(
      `${tabs3}modelBuilder.Entity<${tableName.toUpperCase()}>(entity => {`
    );

    const keys = constraintList.filter((ii) => ii.IsPrimary);
    if (keys.length > 1) {
      const tmp = keys.map((s) => `e.${s.COLUMN_NAME}`).join(", ");
      s.push(`${tabs4}entity.HasKey(e => new {${tmp}});`);
      s.push("");
    } else if (keys.length > 0) {
      const key = keys[0];
      s.push(`${tabs4}entity.HasKey(e => e.${key.COLUMN_NAME});`);
      s.push("");
    }
    const group: {
      [key: string]: StatisticsType[];
    } = {};
    statisticsList
      .filter((s) => s.INDEX_NAME !== "PRIMARY")
      .forEach((statistics) => {
        let list = group[statistics.INDEX_NAME];
        if (list === undefined) {
          list = [statistics];
        } else {
          list.push(statistics);
        }
        group[statistics.INDEX_NAME] = list;
      });
    Object.values(group).forEach((list) => {
      if (list.length === 1) {
        const statistics = list[0];
        s.push(`${tabs4}entity.HasIndex(e => e.${statistics.COLUMN_NAME})`);
        s.push("#if NET5_0_OR_GREATER");
        s.push(
          `${tabs5}.HasDatabaseName("${statistics.INDEX_NAME}");${
            statistics.COMMENT ? `// ${statistics.COMMENT}` : ""
          }`
        );
        s.push("#else");
        s.push(
          `${tabs5}.HasName("${statistics.INDEX_NAME}");${
            statistics.COMMENT ? `// ${statistics.COMMENT}` : ""
          }`
        );
        s.push("#endif");
      } else {
        const tmp = list.map((statistics) => `e.${statistics.COLUMN_NAME}`);
        s.push(`${tabs4}entity.HasIndex(e => new {${tmp.join(", ")}})`);
        const statistics = list[0];
        s.push("#if NET5_0_OR_GREATER");
        s.push(
          `${tabs5}.HasDatabaseName("${statistics.INDEX_NAME}");${
            statistics.COMMENT ? `// ${statistics.COMMENT}` : ""
          }`
        );
        s.push("#else");
        s.push(
          `${tabs5}.HasName("${statistics.INDEX_NAME}");${
            statistics.COMMENT ? `// ${statistics.COMMENT}` : ""
          }`
        );
        s.push("#endif");
      }
      s.push("");
    });
    columnList.forEach((column) => {
      s.push(`${tabs4}entity.Property(e => e.${column.COLUMN_NAME})`);
      if (column.IsRequired) {
        s.push(`${tabs5}.IsRequired()`);
      }
      s.push(`${tabs5}.HasColumnType("${column.COLUMN_TYPE}")`);
      if (column.IsAutoIncrement) {
        s.push(`${tabs5}.ValueGeneratedOnAdd()`);
      }
      if (
        typeof column.COLUMN_DEFAULT === "string" &&
        column.COLUMN_DEFAULT !== "CURRENT_TIMESTAMP"
      ) {
        s.push(`${tabs5}.HasDefaultValueSql("'${column.COLUMN_DEFAULT}'");`);
      } else {
        s[s.length - 1] += ";";
      }
      s.push("");
    });
    s.push(`${tabs3}});`);
    s.push(`${tabs2}}`);
    return s;
  }
}
