(()=>{
	let dlModel = new domainListModel();
	let weModel = new widgetEnableModel();
	initControl();
	function initControl(){
		let list = [
			{ "selector": "#widgetEnableTitle", "property": "innerText", "key": "htmlWidgetEnableTitle" },
			{ "selector": "#widgetEnableDescription", "property": "innerText", "key": "htmlWidgetEnableDescription" },
			{ "selector": "#widgetDisableText", "property": "innerText", "key": "htmlWidgetDisable" },
			{ "selector": "#widgetEnableText", "property": "innerText", "key": "htmlWidgetEnable" },
			{ "selector": "#widgetEnableAllowedDomainText", "property": "innerText", "key": "htmlWidgetEnableAllowedDomain" },
			{ "selector": ".displayFunctionTitle", "property": "innerText", "key": "htmlDisplayFunctionTitle" },
			{ "selector": "#displayFunctionDescription", "property": "innerText", "key": "htmlDisplayFunctionDescription" },
			{ "selector": "#autoDisplayText", "property": "innerText", "key": "extensionOptionAutoView" },
			{ "selector": "#manualDisplayShiftKeyText", "property": "innerText", "key": "extensionOptionManualViewByShiftKey" },
			{ "selector": "#manualDisplayCtrlKeyText", "property": "innerText", "key": "extensionOptionManualViewByCtrlKey" },
			{ "selector": ".domainListTitle", "property": "innerText", "key": "htmlDomainListTitle" },
			{ "selector": "#domainListDescription", "property": "innerText", "key": "htmlDomainListDescription" },
			{ "selector": "#domainAllowedDescription", "property": "innerText", "key": "htmlDomainAllowedDescription" },
			{ "selector": "#noneDomainAllowedDescription", "property": "innerText", "key": "htmlNoneDomainAllowedDescription" }
		];
		setI18n(list);
		let p1 = applyConfig().catch(onReadError);
		let p2 = dlModel.readList().then(applyDomainList).catch(onReadError);
		let p3 = weModel.readValue().then(applyWidgetEnableCheck).catch(onReadError);
		dlModel.addStorageChangeListener(applyDomainList);
		weModel.addStorageChangeListener(applyWidgetEnableCheck);
		ponyfill.storage.onChanged.addListener(storageOnChageBehavior);
		document.querySelector("#control").addEventListener("click", onClickBehavior);
	}
	function applyConfig(){
		return Promise.resolve().then(getConfig).then(gotConfig);
	}
	function getConfig(){
		return ponyfill.storage.sync.get({
			"bf": DEFAULT_AUTO_VIEW_FLAG,
			"sk": DEFAULT_SHIFT_KEY_VIEW_FLAG,
			"ck": DEFAULT_CTRL_KEY_VIEW_FLAG
		});
	}
	function gotConfig(e){
		applyAutoDisplayCheck(e.bf);
		applyManualDisplayShiftKeyCheck(e.sk);
		applyManualDisplayCtrlKeyCheck(e.ck);
	}
	function storageOnChageBehavior(e){
		if( e.hasOwnProperty("w") && e["w"]["newValue"] == windowId ) return;
		if(e.hasOwnProperty("bf")){
			applyAutoDisplayCheck(e.bf.newValue);
		}
		else if(e.hasOwnProperty("sk")){
			applyManualDisplayShiftKeyCheck(e.sk.newValue);
		}
		else if(e.hasOwnProperty("ck")){
			applyManualDisplayCtrlKeyCheck(e.ck.newValue);
		}
	}
	function applyWidgetEnableCheck(value){
		document.querySelector("[name=\"enable\"][value=\""+value+"\"]").checked = true;
	}
	function applyAutoDisplayCheck(value){
		document.querySelector("#autoDisplayCheck").checked = value;
	}
	function applyManualDisplayShiftKeyCheck(value){
		document.querySelector("#manualDisplayShiftKeyCheck").checked = value;
	}
	function applyManualDisplayCtrlKeyCheck(value){
		document.querySelector("#manualDisplayCtrlKeyCheck").checked = value;
	}
	function applyDomainList(domainList){
		let domainListNode = document.querySelector("#domainAllowedList");
		clearChildren(domainListNode);
		let template = document.querySelector("#domainListTemplate");
		for(let i=0; i<domainList.length; i++){
			let node = document.importNode(template.content, true);
			node.querySelector(".domainText").innerText = domainList[i];
			node.querySelector(".domainListRemoveButton").setAttribute("data-domain",domainList[i]);
			domainListNode.appendChild(node);
		}
		if(domainList.length<=0){
			hide(document.querySelector("#domainAllowedDescription"));
			show(document.querySelector("#noneDomainAllowedDescription"));
		}
		else {
			show(document.querySelector("#domainAllowedDescription"));
			hide(document.querySelector("#noneDomainAllowedDescription"));
		}
	}
	function onClickBehavior(e){
		if(e.target.id == "autoDisplayCheck"){
			saveW({"bf": e.target.checked}).catch(onSaveError);
		}
		else if(e.target.id == "manualDisplayShiftKeyCheck"){
			saveW({"sk": e.target.checked}).catch(onSaveError);
		}
		else if(e.target.id == "manualDisplayCtrlKeyCheck"){
			saveW({"ck": e.target.checked}).catch(onSaveError);
		}
		else if(e.target.classList.contains("domainListRemoveButton")){
			e.target.closest(".domainListItem").remove();
			dlModel.removeDomainList(e.target.getAttribute("data-domain")).catch(onSaveError);
		}
	}
})();
