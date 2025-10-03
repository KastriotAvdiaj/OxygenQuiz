#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

# Use the .NET SDK image to build the app
# Stage 1: Build the application
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src

# Copy csproj and restore first (better caching)
COPY OxygenBackend/QuizAPI/*.csproj ./QuizAPI/
RUN dotnet restore "./QuizAPI/QuizAPI.csproj"

# Copy everything else and build
COPY OxygenBackend/QuizAPI/. ./QuizAPI/
WORKDIR /src/QuizAPI
RUN dotnet publish "./QuizAPI/QuizAPI.csproj" -c Release -o /app/publish --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "QuizAPI.dll"]