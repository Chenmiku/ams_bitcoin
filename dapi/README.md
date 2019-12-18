![Picture](http://www.miraway.vn/templates/webdemo/images/logo.png)

## Application
- http://localhost:3000/app/
- http://localhost:3000/device

## Development
Windows:
```sh
go get
run
```

## Build
- For current machine: `go build -o dapi.exe`
- For other platform:
Download gox: `go get github.com/mitchellh/gox`
Windows 386: `gox -osarch="windows/386"`

