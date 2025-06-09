#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src

COPY OxygenBackend/QuizAPI/QuizAPI.csproj ./QuizAPI.csproj
RUN dotnet restore ./QuizAPI.csproj

COPY OxygenBackend/QuizAPI/ ./
# It's good practice to ensure Program.cs and other necessary files are here
# You can list them or rely on the previous COPY if sure.

# The build command correctly uses ./QuizAPI.csproj relative to /src
RUN dotnet build ./QuizAPI.csproj -c Release -o /app/build
# Publish is also fine
RUN dotnet publish ./QuizAPI.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS final # Renamed from just 'final' for clarity
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "QuizAPI.dll"]