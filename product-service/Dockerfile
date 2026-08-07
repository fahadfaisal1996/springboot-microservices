FROM maven:3.9.6-eclipse-temurin-17 as builder

WORKDIR /app

COPY pom.xml .
COPY auth-service/pom.xml auth-service/
COPY api-gateway/pom.xml api-gateway/
COPY product-service/pom.xml product-service/
COPY notification-service/pom.xml notification-service/
COPY discovery-server/pom.xml discovery-server/

COPY product-service/src product-service/src

RUN mvn clean package -pl product-service -am -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=builder /app/product-service/target/*.jar app.jar

EXPOSE 8082
ENTRYPOINT [ "java", "-jar", "app.jar" ]