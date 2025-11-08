package templates

const BackendWebConfig = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Imported Rule 1" stopProcessing="true">
          <match url="^(.*)/$" ignoreCase="false" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" ignoreCase="false" negate="true" />
          </conditions>
          <action type="Redirect" redirectType="Permanent" url="/{R:1}" />
        </rule>
        <rule name="Imported Rule 2" stopProcessing="true">
          <match url="^" ignoreCase="false" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" ignoreCase="false" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsFile" ignoreCase="false" negate="true" />
          </conditions>
          <action type="Rewrite" url="index.php" />
        </rule>
      </rules>
    </rewrite>
    <handlers>
      <remove name="PHP_via_FastCGI" />
      <add name="PHP_via_FastCGI" path="*.php" verb="GET,HEAD,POST,PUT,DELETE,PATCH,OPTIONS" modules="FastCgiModule" scriptProcessor="C:\PHP\php-cgi.exe" resourceType="Either" requireAccess="Script" />
    </handlers>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment=".env" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
`

const FrontendWebConfig = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Router" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/frontend/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="Cache-Control" value="no-cache, no-store, must-revalidate" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
`

const EnvTemplate = `APP_URL=http://localhost
FRONTEND_URL=http://localhost/frontend

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=yachtcrm
DB_USERNAME=yachtcrm_user
DB_PASSWORD=your_password

SESSION_DRIVER=database
CACHE_DRIVER=database

SANCTUM_STATEFUL_DOMAINS=localhost,crm.yourdomain.com
SESSION_DOMAIN=localhost
`
