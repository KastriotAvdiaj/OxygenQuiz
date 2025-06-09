#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

# Use the .NET SDK image to build the app
# Stage 1: Build the application
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src

# First, copy the .csproj file and restore dependencies.
# This path is relative to the repository root (the build context).
COPY OxygenBackend/QuizAPI/QuizAPI.csproj ./QuizAPI/
WORKDIR /src/QuizAPI
RUN dotnet restore

# Now, copy the rest of the backend source code.
WORKDIR /src
COPY OxygenBackend/QuizAPI/ ./QuizAPI/

# Publish the application. The build is included in the publish command.
WORKDIR /src/QuizAPI
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Create the final, smaller runtime image
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS final
WORKDIR /app

# Copy the published output from the build stage
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "QuizAPI.dll"]