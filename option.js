( () => {
	document.addEventListener("DOMContentLoaded", init);

	function init(e){
		let getter = browser.storage.local.get({
			"optionList": []
		});
		getter.then(onGot, onError);

		function onGot(res){
			console.log(res);
			addInputField();
			document.querySelector("#form").addEventListener("click", mainBehavior);
		}
	}

	function mainBehavior(e){
		switch(e.target.getAttribute("class")){
			case "check":
				saveOptions();
				return;
			case "add":
				addInputField();
				return;
			case "removeField":
				e.target.closest(".field").remove();
				return;
		}
	}

	function addInputField(){
		let customNode = document.querySelector("#custom");
		let inputPrototypeNode = document.querySelector("#inputPrototype").cloneNode(true);
		inputPrototypeNode.removeAttribute("id");
		customNode.appendChild(inputPrototypeNode);
		inputPrototypeNode.style.display="block";
	}

	function fetchValue(element, selector){
		let tmp = element.querySelector(selector);
		if (!tmp) return null;
		return tmp.value;
	}

	function makeMetadata(){
		let manifest = browser.runtime.getManifest();
		let now = new Date();
		let data = {
			"version": manifest.version,
			"updateDate": now.toString()
		};
		//console.log(data);
		return data;
	}

	function saveOptions(){
		let fields = document.querySelectorAll("#form .field");
		let optionList = [];
		for( let i=0; i<fields.length; i++){
			let check = fields[i].querySelector(".check");
			let checked = check.checked;
			let value = check.value;
			let label = fetchValue(fields[i], ".label");
			let url = fetchValue(fields[i], ".url");
			let data = {
				"id": (i+1),
				"value": value,
				"checked": checked,
				"label": label,
				"url": url,
				"sort": i,
				"a": check,
			};
			optionList.push(data);
		}

		let getter = browser.runtime.getBackgroundPage();
		getter.then(onGot, onError).then(onSave, onError);

		function onGot(page){
			console.log("onGot");
			let saver = page.saveOptions( makeMetadata(), optionList );
			return saver;
		}

		function onSave(){
			console.log("onSave");
		}

	}

	function onError(e){
		console.error(e);
	}

})();
