FROM maven:3.9.6-eclipse-temurin-17-alpine as builder
WORKDIR /app

COPY pom.xml .
COPY discovery-server/pom.xml discovery-server/
COPY auth-service/pom.xml auth-service/
COPY api-gateway/pom.xml api-gateway/
COPY product-service/pom.xml product-service/
COPY notification-service/pom.xml notification-service/
COPY discovery-server/src discovery-server/src

RUN mvn clean package -pl discovery-server -am -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=builder /app/discovery-server/target/*.jar app.jar

EXPOSE 8761
ENTRYPOINT [ "java", "-jar", "app.jar" ]

