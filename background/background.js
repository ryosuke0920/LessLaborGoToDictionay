ponyfill.runtime.onInstalled.addListener( install ); /* call as soon as possible　*/
const DEFAULT_LOCALE = "en";
let optionList = [];
let autoViewFlag = true;
let shiftKey = false;
let ctrlKey = false;
let options = {};
let faviconCache = {};

Promise.resolve()
.then(getSetting)
.then(initContextMenu)
.then(initListener)
.then(clearFaviconCache)
.then(downloadFavicon)
.then(updateFaviconCache)
.catch(unexpectedError);

function install(e){
	if(e.reason == "install"){
		let data = {
			"ol": getDefaultOptionList()
		};
		return save(data)
		.then(getSetting)
		.then(initContextMenu)
		.then(downloadFavicon)
		.then(updateFaviconCache)
		.catch(onSaveError);
	}
}
function initContextMenu(){
	return getSetting().then(resetMenu, onReadError);
}

function getSetting() {
	return ponyfill.storage.sync.get({
		"ol": [],
		"bf": true,
		"sk": false,
		"ck": false
	}).then(onGotSetting);
}

function onGotSetting(json){
	optionList = json["ol"];
	autoViewFlag = json["bf"];
	shiftKey = json["sk"];
	ctrlKey = json["ck"];
}

function initListener(){
	ponyfill.storage.onChanged.addListener( onStorageChanged );
	ponyfill.contextMenus.onClicked.addListener( contextMenuBehavior );
	ponyfill.runtime.onMessage.addListener(notify);
	ponyfill.browserAction.onClicked.addListener((e)=>{
		ponyfill.runtime.openOptionsPage();
	});
}

function openWindow( url, text){
	let promise = ponyfill.tabs.create({"url": makeURL(url,text)});
	return promise.catch(onOpenWindowError);
}

function notify(message, sender, sendResponse){
	let method = message.method;
	let data = message.data;
	if( method == "notice" ){
		return notice(data);
	}
	else if( method == "saveHistory" ){
		return saveHistory(data);
	}
	else if( method == "openOptions" ){
		return ponyfill.runtime.openOptionsPage();
	}
	else if( method == "getFavicon" ){
		return Promise.resolve(faviconCache);
	}
	else {
		return save(data);
	}
}

function saveAutoViewFlag(flag=true){
	return save({"bf":flag}).catch(onSaveError);
}

function saveManualViewShiftKey(flag=false){
	return save({"sk":flag}).catch(onSaveError);
}

function saveManualViewCtrlKey(flag=false){
	return save({"ck":flag}).catch(onSaveError);
}

function addHistory(e){
	let db = e.target.result;
	let transaction = db.transaction(["historys"], WRITE);
	let promise = new Promise((resolve,reject)=>{
		let historys = transaction.objectStore(HISTORYS);
		let req = historys.add(this.data);
		req.onsuccess = (e)=>{
			resolve(e);
		};
		req.onerror = (e)=>{
			reject(e);
		};
	});
	return promise;
}

function saveHistory(data){
	data.date = new Date();
	let obj = {"data": data};
	return Promise.resolve()
		.then(indexeddb.open.bind(indexeddb))
		.then(indexeddb.prepareRequest.bind(indexeddb))
		.then(addHistory.bind(obj));
}

function onStorageChanged(change, area){
	if(change["ol"] || change["bf"] || change["sk"] || change["ck"]) {
		if(change["ol"]) optionList = change["ol"]["newValue"];
		if(change["bf"]) autoViewFlag = change["bf"]["newValue"];
		if(change["sk"]) shiftKey = change["sk"]["newValue"];
		if(change["ck"]) ctrlKey = change["ck"]["newValue"];
		resetMenu();

	}
	if(change["ol"]) {
		Promise.resolve().then( downloadFavicon ).then( updateFaviconCache );
	};
}

function resetMenu(json){
	ponyfill.contextMenus.removeAll();
	options = {};
	for(let i=0; i<optionList.length; i++){
		let data = optionList[i];
		let checked = data["c"];
		let hist = data["h"];
		if ( checked ) {
			let id = (i+1).toString();
			let label = data["l"];
			let url = data["u"];
			let args = {
				"id": id,
				"title": label,
				"contexts": ["selection"]
			};
			options[id] = {
				"hist": hist,
				"url": url,
				"label": label
			}
			ponyfill.contextMenus.create(args);
		}
	}
	if( 0 < optionList.length ) {
		ponyfill.contextMenus.create({
			"type": "separator",
			"contexts": ["selection"]
		});
	}
	ponyfill.contextMenus.create({
		"id": "autoView",
		"title": ponyfill.i18n.getMessage("extensionOptionAutoView"),
		"checked": autoViewFlag,
		"type": "checkbox",
		"contexts": ["page","selection"]
	});
	ponyfill.contextMenus.create({
		"id": "manualView",
		"title": ponyfill.i18n.getMessage("extensionOptionManualView"),
		"contexts": ["page","selection"]
	});
	ponyfill.contextMenus.create({
		"parentId": "manualView",
		"id": "manualViewShiftKey",
		"title": ponyfill.i18n.getMessage("extensionOptionManualViewByShiftKey"),
		"checked": shiftKey,
		"type": "checkbox",
		"contexts": ["page","selection"]
	});
	ponyfill.contextMenus.create({
		"parentId": "manualView",
		"id": "manualViewCtrlKey",
		"title": ponyfill.i18n.getMessage("extensionOptionManualViewByCtrlKey"),
		"checked": ctrlKey,
		"type": "checkbox",
		"contexts": ["page","selection"]
	});
	ponyfill.contextMenus.create({
		"id": "option",
		"title": ponyfill.i18n.getMessage("extensionOptionName"),
		"contexts": ["page","selection"]
	});
}

function contextMenuBehavior(info, tab){
	let promise;
	if ( info.menuItemId == "option" ){
		promise = ponyfill.runtime.openOptionsPage();
	}
	else if ( info.menuItemId == "autoView" ){
		saveAutoViewFlag(info.checked);
	}
	else if ( info.menuItemId == "manualViewShiftKey" ){
		saveManualViewShiftKey(info.checked);
	}
	else if ( info.menuItemId == "manualViewCtrlKey" ){
		saveManualViewCtrlKey(info.checked);
	}
	else if ( options.hasOwnProperty( info.menuItemId ) ){
		openWindow(options[info.menuItemId]["url"], info.selectionText );
		if( options[info.menuItemId]["hist"] ){
			saveHistory({
				"text": info.selectionText,
				"fromURL": tab.url.toString(),
				"fromTitle": tab.title.toString(),
				"toURL": options[info.menuItemId]["url"],
				"toTitle": options[info.menuItemId]["label"]
			}).catch( onSaveError );
		}
	}
}

function getDefaultOptionList(){
	let lang = ponyfill.i18n.getUILanguage();
	let matcher = lang.match(/^([a-zA-Z0-9]+)\-[a-zA-Z0-9]+$/);
	if( matcher ){
		lang = matcher[1];
	}
	if ( lang && DEFAULT_OPTION_LIST[lang] ) {
		return DEFAULT_OPTION_LIST[lang];
	}
	lang = ponyfill.runtime.getManifest()["default_locale"];
	if ( lang && DEFAULT_OPTION_LIST[lang] ) {
		return DEFAULT_OPTION_LIST[lang];
	}
	return DEFAULT_OPTION_LIST[DEFAULT_LOCALE];
}

function clearFaviconCache(){
	console.log("clearFaviconCache");
	faviconCache = {};
	return Promise.resolve()
	.then( indexeddb.open.bind(indexeddb) )
	.then( indexeddb.prepareRequest.bind(indexeddb) )
	.then( clearFavicon );
}

function clearFavicon(e){
	return new Promise((resolve, reject)=>{
		let db = e.target.result;
		let transaction = db.transaction([FAVICONS], WRITE);
		let objectStore = transaction.objectStore(FAVICONS);
		let req = objectStore.clear();
		req.onsuccess = (e)=>{ resolve(e); };
		req.onerror = (e)=>{
			console.error(e);
			reject(e);
		};
	});
}

function downloadFavicon(){
	console.log("downloadFavicon");
	let p = Promise.resolve();
	for(let i=0; i<optionList.length; i++){
		let obj = optionList[i];
		if(!obj.c) continue;
		if(faviconCache.hasOwnProperty(obj.u)) continue;
		let url = convertFaviconURL(obj.u);
		let data = {
			"data": {
				"url": url,
				"date": new Date(),
				"blob": null
			}
		};
		p = p.then( requestAjaxFavicon.bind(data) )
		.then( responseAjaxFavicon.bind(data) )
		.then( indexeddb.open.bind(indexeddb) )
		.then( indexeddb.prepareRequest.bind(indexeddb) )
		.then( putFavicon.bind(data) )
		.catch((e)=>{ console.error(e); });
	}
	return p;
}

function requestAjaxFavicon(){
	return promiseAjax("GET", this.data.url, "blob");
}

function responseAjaxFavicon(e){
	return new Promise((resolve, reject)=>{
		if(e.target.status == "200"){
			this.data.blob = e.target.response;
			resolve(e);
		}
		else {
			console.error(e);
			reject(e);
		}
	});
}

function putFavicon(e){
	return new Promise((resolve, reject)=>{
		let db = e.target.result;
		let transaction = db.transaction([FAVICONS], WRITE);
		let objectStore = transaction.objectStore(FAVICONS);
		let req = objectStore.put(this.data);
		req.onsuccess = (e)=>{ resolve(e); };
		req.onerror = (e)=>{
			console.error(e);
			reject(e);
		};
	});
}

function convertFaviconURL(url){
	return remainDomainURL(url) + "favicon.ico";
}

function remainDomainURL(url){
	let newURL = "";
	let count = 0;
	for(let i=0; i<url.length; i++){
		let str = url.substr(i,1);
		newURL += str;
		if(str == "/") count++;
		if(3 <= count) break;
	}
	if(count < 3) newURL += "/";
	return newURL;
}

function updateFaviconCache(){
	console.log("updateFaviconCache");
	let p = Promise.resolve();
	let list = [];
	for(let i=0; i<optionList.length; i++){
		if(!optionList[i].c) continue;
		if( faviconCache.hasOwnProperty(optionList[i].u) ) continue;
		let obj = {
			"url": optionList[i].u,
			"faviconURL": convertFaviconURL(optionList[i].u),
			"blob": null,
			"base64": null
		};
		list.push(obj);
	}
	if( list.length <= 0 ) return p;
	p = p.then( indexeddb.open.bind(indexeddb) )
	.then( indexeddb.prepareRequest.bind(indexeddb) )
	.then( loopGetFavicon.bind({"list":list}) );
	return p;
}

function loopGetFavicon(e){
	let p = Promise.resolve();
	let db = e.target.result;
	for(let i=0; i<this.list.length; i++){
		let obj = this.list[i];
		obj.db = db;
		p = p.then( getFavicon.bind(obj) )
		.then( convertFavicon.bind(obj) )
		.then( setFaviconCache.bind(obj) )
		.catch( (e)=>{ console.error(e) });
	}
	return p;
}

function getFavicon(){
	return new Promise((resolve, reject)=>{
		let transaction = this.db.transaction([FAVICONS], READ);
		let objectStore = transaction.objectStore(FAVICONS);
		let req = objectStore.get(this.faviconURL);
		req.onsuccess = (e)=>{
			if( e.target.result ) {
				this.blob = e.target.result.blob;
				resolve();
			}
			else {
				this.blob = null;
				resolve();
			}
		};
		req.onerror = (e)=>{
			console.error(e);
			reject(e);
		};
	});
}

function convertFavicon(){
	return new Promise((resolve,reject)=>{
		if(this.blob == null){
			resolve();
			return;
		}
		let reader = new FileReader();
		reader.readAsDataURL(this.blob);
		reader.onloadend = (e)=>{
			this.base64 = reader.result;
			resolve();
		}
		reader.onerror = (e)=>{
			console.error(e);
			reject(e);
		}
		reader.onabort = (e)=>{
			console.error(e);
			reject(e);
		}
	});
}

function setFaviconCache(){
	if(this.base64) faviconCache[this.url] = this.base64;
	return;
}
