# syntax=docker/dockerfile:1.6

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY QuizAPI/QuizAPI.csproj ./
RUN dotnet restore QuizAPI.csproj

COPY QuizAPI/. ./
RUN dotnet publish QuizAPI.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ConnectionStrings__SqlServer="" \
    ConnectionStrings__Hangfire="" \
    Jwt__Key="" \
    Jwt__Issuer="" \
    Jwt__Audience=""

COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "QuizAPI.dll"]