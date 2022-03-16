APP_FILES := $(shell find app -name "node_modules" -prune -o -name "dist" -prune -o -name "last_run_*" -prune -o -type f -print)
FACTORY_FILES := $(shell find factoryapp/app -type f)

.PHONY: all
all: tarball
#do nothing

factoryapp/last_run_prod: $(FACTORY_FILES)
	rm -f factoryapp/last_run_*
	cd factoryapp &&  bower install && npm install && grunt build --force
	touch factoryapp/last_run_prod

factoryapp/last_run_debug: $(FACTORY_FILES)
	rm -f factoryapp/last_run_*
	cd factoryapp && bower install && npm install && grunt build_debug
	touch factoryapp/last_run_debug

.PHONY: factoryapp_build
factoryapp_build: factoryapp/last_run_prod
#do nothing

.PHONY: factoryapp_build_debug
factoryapp_build_debug: factoryapp/last_run_debug
#do nothing

app/last_run_prod: $(APP_FILES)
	rm -f app/last_run_*
	cd app && npm install && gulp clean && gulp build --production
	touch app/last_run_prod

app/last_run_debug: $(APP_FILES)
	rm -f app/last_run_*
	cd app && npm install && gulp build
	touch app/last_run_debug

.PHONY: app_build
app_build: app/last_run_prod
#do nothing

.PHONY: app_build_debug
app_build_debug: app/last_run_debug
#do nothing

.PHONY: install
install: app_build factoryapp_build
	mkdir -p $(INSTALL_PREFIX)/web/app
	cp -r app/dist/* $(INSTALL_PREFIX)/web/app/
	mkdir -p $(INSTALL_PREFIX)/web/factoryapp
	cp -r factoryapp/dist/* $(INSTALL_PREFIX)/web/factoryapp/

.PHONY: scp_app
scp_app: app_build_debug
	scp -rC app/dist/* root@zed:/web/app/

.PHONY: scp_factoryapp
scp_factoryapp: factoryapp_build_debug
	scp -rC factoryapp/dist/* root@zed:/web/factoryapp

.PHONY: scp
scp: scp_app scp_factoryapp
	

.PHONY: dist
dist: app_build factoryapp_build
	rm -rf dist
	mkdir -p dist
	$(MAKE) INSTALL_PREFIX=dist install

.PHONY: tarball
tarball: dist
	rm -f webui_*.tar.gz
	tar -czf webui_local.tar.gz --transform="s|dist||" dist
	$(eval SW_VERSION:=$(shell git describe --tags --dirty --always))
	cp webui_local.tar.gz webui_$(SW_VERSION).tar.gz

.PHONY: clean
clean:
	rm -rf factoryapp/dist
	rm -rf factoryapp/last_run_*
	rm -rf app/dist
	rm -rf app/last_run_*
	rm -f webui_*.tar.gz
