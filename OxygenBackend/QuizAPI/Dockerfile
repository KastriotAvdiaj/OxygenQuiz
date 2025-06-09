#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

# Build Stage
# Set up build environment
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src

COPY ["QuizAPI.csproj", "."]
RUN dotnet restore "./QuizAPI.csproj"

COPY . .
RUN dotnet build "./QuizAPI.csproj" -c Release -o /app/build
RUN dotnet publish "./QuizAPI.csproj" -c Release -o /app/publish

# Set up runtime environment
FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "QuizAPI.dll"]
