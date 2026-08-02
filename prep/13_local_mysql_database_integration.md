# Topic 13: Local MySQL Database Integration & Spring Data JPA

---

## ❓ What Problem Does Local MySQL Integration Solve?

During development:
1. **H2 In-Memory Database** stores data in RAM. Every time a microservice restarts, registered users and catalog products are wiped clean.
2. Developers cannot inspect data using popular SQL client tools (like MySQL Workbench, DBeaver, or DataGrip) via standard MySQL TCP port `3306`.
3. SQL queries written for H2 dialect can sometimes behave differently when deployed to real relational databases in production.

**Local MySQL Integration** provides an actual **MySQL 8.0 Server** running locally on port `3306`, giving developers persistence and direct SQL console access.

---

## 🏗️ Local MySQL Dev Architecture

```
+------------------------------------+------------------------------------+
|            Auth Service            |          Product Service           |
|            (Port 8081)             |            (Port 8082)             |
+-----------------+------------------+-----------------+------------------+
                  |                                    |
     Spring Profile: mysql                Spring Profile: mysql
     jdbc:mysql://localhost:3306/authdb   jdbc:mysql://localhost:3306/productdb
                  |                                    |
                  +-----------------+------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |   Local MySQL 8.0 Server (3306)   |
                  |     (authdb & productdb Schemas)  |
                  +-----------------+-----------------+
                                    ^
                                    | Direct SQL Connections
                  +-----------------+-----------------+
                  | DBeaver / Workbench / MySQL CLI   |
                  +-----------------------------------+
```

---

## 💻 Code Implementation in Our Project

### 1. MySQL Driver Dependency (`auth-service` & `product-service`)

In [`auth-service/pom.xml`](file:///c:/SpringBoot/auth-service/pom.xml) & [`product-service/pom.xml`](file:///c:/SpringBoot/product-service/pom.xml):

```xml
<!-- MySQL Connector Java Driver -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

---

### 2. Spring Profile Configuration (`application-mysql.yml`)

In [`auth-service/src/main/resources/application-mysql.yml`](file:///c:/SpringBoot/auth-service/src/main/resources/application-mysql.yml):

```yaml
spring:
  config:
    activate:
      on-profile: mysql # Activated when spring.profiles.active=mysql
  datasource:
    # Auto-creates database 'authdb' if it does not exist on MySQL server
    url: jdbc:mysql://localhost:3306/authdb?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: password
  jpa:
    database-platform: org.hibernate.dialect.MySQLDialect
    hibernate:
      ddl-auto: update # Automatically updates table structure based on JPA entities
    show-sql: true # Logs executed SQL statements to standard output
```

In [`product-service/src/main/resources/application-mysql.yml`](file:///c:/SpringBoot/product-service/src/main/resources/application-mysql.yml):

```yaml
spring:
  config:
    activate:
      on-profile: mysql # Activated when spring.profiles.active=mysql
  datasource:
    url: jdbc:mysql://localhost:3306/productdb?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: password
  jpa:
    database-platform: org.hibernate.dialect.MySQLDialect
    hibernate:
      ddl-auto: update
    show-sql: true
```

---

### 3. Local MySQL Server Launcher (`docker-compose-mysql.yml`)

In [`docker-compose-mysql.yml`](file:///c:/SpringBoot/docker-compose-mysql.yml):

```yaml
version: '3.8'

services:
  mysql-dev:
    image: mysql:8.0
    container_name: mysql-dev
    command: --default-authentication-plugin=mysql_native_password
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: password
    ports:
      - "3306:3306"
    volumes:
      - mysql-dev-data:/var/lib/mysql

volumes:
  mysql-dev-data:
```

---

## 🛠️ Step-by-Step Usage & SQL Console Examples

### Step 1: Start Local MySQL Server
```bash
docker-compose -f docker-compose-mysql.yml up -d
```

### Step 2: Start Microservices with MySQL Profile
```powershell
# Start Auth Service connected to MySQL
cd c:\SpringBoot\auth-service
mvn spring-boot:run -Dspring-boot.run.profiles=mysql

# Start Product Service connected to MySQL
cd c:\SpringBoot\product-service
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

### Step 3: Connect via MySQL CLI or GUI (DBeaver / Workbench)
- **Host**: `localhost`
- **Port**: `3306`
- **User**: `root`
- **Password**: `password`

```sql
-- Select and query User Accounts in Auth DB
USE authdb;
SHOW TABLES;
SELECT id, username, email, role FROM users;

-- Select and query Product Catalog in Product DB
USE productdb;
SHOW TABLES;
SELECT id, name, price, stock_quantity, category FROM products;

-- Manually update product stock from MySQL Console
UPDATE products 
SET stock_quantity = 150 
WHERE name = 'UltraBook Pro 15';

-- Insert custom product from MySQL Console
INSERT INTO products (name, description, price, stock_quantity, category)
VALUES ('Curved Gaming Monitor 34"', '144Hz WQHD Display', 499.99, 20, 'Electronics');
```

---

## 🔍 Key Concepts & Takeaways

1. **Spring Profiles (`spring.profiles.active=mysql`)**: Allows switching between in-memory H2 (`default`) and real local MySQL without changing Java source code.
2. **`createDatabaseIfNotExist=true`**: Ensures MySQL automatically provisions `authdb` and `productdb` schemas on first boot.
3. **Data Persistence Across Restarts**: Unlike H2, data created in MySQL persists across service restarts, enabling long-running local development and debugging.
