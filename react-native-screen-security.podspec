require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name            = "react-native-screen-security"
  s.version         = package["version"]
  s.summary         = package["summary"]
  s.description     = package["description"]
  s.homepage        = "https://github.com/yuriikluban/react-native-screen-security"
  s.license         = package["license"]
  s.platforms       = { :ios => "13.4" }
  s.author          = package["author"]
  s.source          = { :git => "https://github.com/yuriikluban/react-native-screen-security.git", :tag => "#{s.version}" }

  s.source_files    = "ios/**/*.{h,m,mm,swift}"
  s.swift_version   = "5.0"

  install_modules_dependencies(s)
end