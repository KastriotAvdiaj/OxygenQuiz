#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

# Use the .NET SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build

WORKDIR /src

# Now the csproj path is relative to OxygenBackend
COPY QuizAPI/QuizAPI.csproj ./QuizAPI.csproj
RUN dotnet restore ./QuizAPI.csproj

# Copy all source files from QuizAPI folder
COPY OxygenBackend/QuizAPI/ .


RUN dotnet build ./QuizAPI.csproj -c Release -o /app/build
RUN dotnet publish ./QuizAPI.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "QuizAPI.dll"]