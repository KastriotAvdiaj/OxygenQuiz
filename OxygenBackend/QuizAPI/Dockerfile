#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

#Depending on the operating system of the host machines(s) that will build or run the containers, the image specified in the FROM statement may need to be changed.
#For more information, please see https://aka.ms/containercompat



# --- STAGE 1: restore & publish ---
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src

# 1) copy solution and project files
COPY ["QuizAPI.sln", "./"]
COPY ["QuizAPI.csproj", "./"]

# restore by solution (good if you ever add more projects)
RUN dotnet restore "QuizAPI.sln"

# 2) copy everything else and publish
COPY . .
WORKDIR /src
RUN dotnet publish "QuizAPI.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# --- STAGE 2: runtime image ---
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS runtime
WORKDIR /app

# pull in the published output
COPY --from=build /app/publish .

# expose the ports you need
EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "QuizAPI.dll"]