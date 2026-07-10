# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["QuizAPI.csproj", "."]
RUN dotnet restore "./QuizAPI.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "./QuizAPI.csproj" -c $BUILD_CONFIGURATION -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./QuizAPI.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
# Data Protection key ring (/app/keys) and user uploads (/app/wwwroot/uploads) both live on mounted
# Docker volumes so they survive container rebuilds. Create them owned by the non-root app user
# ($APP_UID) so the app can write to them — a named volume inherits the mount point's ownership from
# the image, so without this the volume would be root-owned and uploads would fail with EACCES.
USER root
RUN mkdir -p /app/keys /app/wwwroot/uploads && chown -R $APP_UID:$APP_UID /app/keys /app/wwwroot
USER $APP_UID
ENTRYPOINT ["dotnet", "QuizAPI.dll"]