#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src

# Copy only the .csproj file first for better layer caching
# This assumes the Docker build context is the root of your repository (e.g., OxygenQuiz/)
# and your API project is in OxygenBackend/QuizAPI/
COPY OxygenBackend/QuizAPI/QuizAPI.csproj ./QuizAPI.csproj
RUN dotnet restore ./QuizAPI.csproj

# Copy the rest of the source code for the API project
COPY OxygenBackend/QuizAPI/ ./

# Build the project
# The build command correctly uses ./QuizAPI.csproj relative to /src
RUN dotnet build ./QuizAPI.csproj -c Release -o /app/build

# Publish the project
# This also builds if not already built, but it's good practice to have a separate build step sometimes for clarity or specific build args
RUN dotnet publish ./QuizAPI.csproj -c Release -o /app/publish

# Final Stage (Runtime)
# Renamed the alias from just 'final' for clarity - this comment is now on its own line
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS final
WORKDIR /app

# Copy the published output from the build stage
COPY --from=build /app/publish .

# Define the entry point for the container
ENTRYPOINT ["dotnet", "QuizAPI.dll"]