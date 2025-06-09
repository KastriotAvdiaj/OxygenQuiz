#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

# Use SDK image for build stage
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build

WORKDIR /src

# Copy csproj and restore dependencies
COPY ["QuizAPI.csproj", "./"]
RUN dotnet restore "./QuizAPI.csproj"

# Copy the rest of the source code
COPY . .

# Build the project in Release mode and output to /app/build
RUN dotnet build "./QuizAPI.csproj" -c Release -o /app/build

# Publish the project to /app/publish folder
RUN dotnet publish "./QuizAPI.csproj" -c Release -o /app/publish

# Use runtime image for the final stage
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS runtime

WORKDIR /app

# Copy published app from build stage
COPY --from=build /app/publish .

# Expose the port your app listens on (e.g. 80)
EXPOSE 80

# Set the entrypoint
ENTRYPOINT ["dotnet", "QuizAPI.dll"]
