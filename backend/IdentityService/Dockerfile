# syntax=docker/dockerfile:1

FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
COPY settings.xml /root/.m2/settings.xml
COPY src ./src

RUN --mount=type=cache,id=mems-identity-google-cache,target=/root/.m2/repository \
    mvn -B -s /root/.m2/settings.xml package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]