set x=%cd%
md build\chrome
cd chrome
7z a -tzip "%x%.jar" * -r -mx=0 -xr!.svn
move "%x%.jar" ..\build\chrome
cd ..
copy install.* build
xcopy /s defaults build\defaults\
cd build
7z a -tzip "%x%.xpi" * -r -mx=9 -xr!.svn
move "%x%.xpi" ..\
cd ..
rd build /s/q