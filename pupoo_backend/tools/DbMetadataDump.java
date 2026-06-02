import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class DbMetadataDump {
    private record ColumnRow(
        String tableName,
        String columnName,
        String columnType,
        String isNullable,
        String columnKey,
        String extra
    ) {}

    public static void main(String[] args) throws Exception {
        String url = System.getenv("SPRING_DATASOURCE_URL");
        String username = System.getenv("SPRING_DATASOURCE_USERNAME");
        String password = System.getenv("SPRING_DATASOURCE_PASSWORD");
        if (url == null || username == null || password == null) {
            throw new IllegalStateException("Datasource environment variables are missing.");
        }

        Class.forName("com.mysql.cj.jdbc.Driver");

        try (Connection connection = DriverManager.getConnection(url, username, password)) {
            String schema = connection.getCatalog();
            dumpTables(connection, schema);
            dumpColumns(connection, schema);
            dumpEnums(connection, schema);
        }
    }

    private static void dumpTables(Connection connection, String schema) throws Exception {
        String sql = """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = ?
            ORDER BY table_name
            """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            try (ResultSet rs = statement.executeQuery()) {
                System.out.println("==TABLES==");
                while (rs.next()) {
                    System.out.println(rs.getString("table_name"));
                }
            }
        }
    }

    private static void dumpColumns(Connection connection, String schema) throws Exception {
        String sql = """
            SELECT table_name, column_name, column_type, is_nullable, column_key, extra
            FROM information_schema.columns
            WHERE table_schema = ?
            ORDER BY table_name, ordinal_position
            """;

        List<ColumnRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    rows.add(new ColumnRow(
                        rs.getString("table_name"),
                        rs.getString("column_name"),
                        rs.getString("column_type"),
                        rs.getString("is_nullable"),
                        rs.getString("column_key"),
                        rs.getString("extra")
                    ));
                }
            }
        }

        rows.sort(Comparator.comparing(ColumnRow::tableName).thenComparing(ColumnRow::columnName));
        System.out.println("==COLUMNS==");
        for (ColumnRow row : rows) {
            System.out.printf(
                "%s|%s|%s|%s|%s|%s%n",
                row.tableName(),
                row.columnName(),
                row.columnType(),
                row.isNullable(),
                row.columnKey(),
                row.extra()
            );
        }
    }

    private static void dumpEnums(Connection connection, String schema) throws Exception {
        String sql = """
            SELECT table_name, column_name, column_type
            FROM information_schema.columns
            WHERE table_schema = ?
              AND data_type = 'enum'
            ORDER BY table_name, column_name
            """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            try (ResultSet rs = statement.executeQuery()) {
                System.out.println("==ENUMS==");
                while (rs.next()) {
                    System.out.printf(
                        "%s|%s|%s%n",
                        rs.getString("table_name"),
                        rs.getString("column_name"),
                        rs.getString("column_type")
                    );
                }
            }
        }
    }
}
