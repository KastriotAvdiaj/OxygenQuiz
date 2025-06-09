#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat

# Use the .NET SDK image to build the app
# Stage 1: Build the application
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src

# --- Optimization: Restore dependencies first ---
# The paths on the LEFT ("OxygenBackend/...") are relative to your GitHub repo root.
# The paths on the RIGHT ("./QuizAPI/") are where they will be placed inside the container.

# Copy the solution file and the project file
COPY ["OxygenBackend/QuizAPI/QuizAPI.sln", "./QuizAPI/"]
COPY ["OxygenBackend/QuizAPI/QuizAPI.csproj", "./QuizAPI/"]

# Restore dependencies for the entire solution. The path is inside the container.
RUN dotnet restore "QuizAPI/QuizAPI.sln"


# --- Build and Publish ---
# Copy the rest of your backend source code into the container
COPY ./OxygenBackend/QuizAPI/. ./QuizAPI/

# Publish the specific project. We tell dotnet exactly which project to publish.
# The --no-restore flag is used because we already restored in a previous step.
RUN dotnet publish "QuizAPI/QuizAPI.csproj" -c Release -o /app/publish --no-restore


# Stage 2: Create the final, smaller runtime image
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS final
WORKDIR /app

# Copy the published output from the build stage
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "QuizAPI.dll"]