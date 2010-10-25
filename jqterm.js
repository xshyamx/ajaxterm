function jqTermTransporter(observer, params) {
	this.buf = "";
	this.timeout = null;
	this.error_timeout = null;
	this.error_timeout_max = 10000;
	this.sending = 0;
	this.rmax = 1;
	this.keybuf = [];
	this.observer = observer;
	this.dest_url = params.url;
	this.width = params.width;
	this.height = params.height;
	this.accepted = false;

	this.init();
	this.params = {
		'sid' : {
			'set' : true,
			'key' : 's',
			'val' : params.sid
		},
		'colour' : {
			'set' : true,
			'key' : 'c',
			'val' : 1
		}
	};
}

jqTermTransporter.prototype = {
	init: function() {
		var thisObj = this;
		this.timeout = setTimeout(function() { thisObj.update();}, 100);
	},
	setUrl: function(url) {
		this.dest_url = url;
	},
	setColour: function(isOn) {
		this.params.colour['set'] = isOn;
	},
	queue: function(s) {
		var thisObj = this;
//		console.log("adding: " + s);
		this.keybuf.unshift(s);
		if(this.sending == 0) {
			clearTimeout(this.timeout);
			this.timeout = setTimeout(function() { thisObj.update();}, 2);
		}
	},
	update: function() {
		if(this.sending == 0) {
			var thisObj = this;
			this.sending = 1;
			this.observer.trigger('jqtt.sending', 'on');

			var keydata = "";
			while(this.keybuf.length>0) {
				keydata += this.keybuf.pop();
			}

			var data = {};
			for(i in this.params) {
				var item = this.params[i];
				if(item.set) {
					data[item.key] = item.val;
				}
			}
			if(!this.accepted) {
				data['w'] = this.width;
				data['h'] = this.height;
			}
			data['k'] = keydata;

			$.ajax({
				url: this.dest_url,
				data: data,
				success: function(data, textStatus, xhr) {
					clearTimeout(thisObj.error_timeout);

					thisObj.accepted = true;
					if(xhr.responseXML.documentElement.tagName == "pre") {
						thisObj.observer.trigger('jqtt.sendSuccess', xhr.responseText);
						thisObj.rmax=100;
					} else {
						thisObj.rmax*=2;
						if(thisObj.rmax > 2000) {
							thisObj.rmax = 2000;
						}
					}
					thisObj.sending = 0;
					thisObj.timeout = setTimeout(function() { thisObj.update(); }, thisObj.rmax);
				},
				errors: function(req) {
					thisObj.observer.trigger('jqtt.debug', "Connection error status:" + req.status);
				}
			});
			thisObj.error_timeout = setTimeout(function() { thisObj.observer.trigger('jqtt.error', {}); }, thisObj.error_timeout_max);
		}
	}
}

function jqTerm(container_id, url, params) {
	this.sid = Math.round(Math.random()*10000000000);
	if(!params) {
		params = []
	}
	var width = params['width'] ? params['width'] : 80;
	var height = params['height'] ? params['height'] : 25;

	this.base_url = url;

	this.term_container = $('#' + container_id);
	if(!this.term_container) {
		console.log("Unknown terminal container: " + container_id);
		return false;
	}
	this.dstat = $('<pre></pre>');
	this.sled = $('<span></span>');
	this.opt_color = $('<a></a>');
	this.sdebug = $('<span></span>');
	this.dterm = $('<div></div>');

	this.transporter = new jqTermTransporter(this.term_container, {'sid':this.sid, 'url':this.base_url, 'width':width, 'height':height});
	this.init();
}

jqTerm.prototype = {
	init: function() {
		this.sled.append(document.createTextNode('\xb7'));
		this.sledStatus('off');

		this.dstat.append(this.sled);
		this.dstat.append(document.createTextNode(' '));

		this.opt_add(this.opt_color,'Colors');
		this.opt_color.attr('class', 'on');

		this.dstat.append(this.sdebug);
		this.dstat.attr('class', 'stat');

		this.term_container.append(this.dstat);
		this.term_container.append(this.dterm);

		var thisObj = this;
		this.opt_color.click(function() { thisObj.do_color(); });
//		$(document).bind('paste', function(e) { thisObj.do_paste(); });

		$(document).bind('keydown', function(e) { return thisObj.keydown(e); });
		$(document).bind('keypress', function(e) { return thisObj.keypress(e); });
		this.term_container.bind('jqtt.sending', function(el, class_name) { return thisObj.sending(class_name); });
		this.term_container.bind('jqtt.sendSuccess', function(el, sid) { return thisObj.sendSuccess(sid); });
		this.term_container.bind('jqtt.debug', function(el, msg) { return thisObj.debug(msg); });
		this.term_container.bind('jqtt.error', function(el) { return thisObj.error(); });
	},
	opt_add: function(opt,name) {
		opt.attr('class', 'off');
		opt.html(' ' + name + ' ');
		this.dstat.append(opt);
		this.dstat.append(document.createTextNode(' '));
	},
	debug: function(s) {
		this.sdebug.html(s);
	},
	error: function() {
		this.sledStatus('off');
		this.debug("Connection lost timeout ts:"+((new Date).getTime()));
	},
	do_color: function() {
		var o = this.opt_color.attr('class') == 'off' ? 'on' : 'off';
		this.opt_color.attr('class', o);
		this.transporter.setColour(o == 'on');
		this.debug('Color ' + this.opt_color.attr('class'));
	},
	do_paste: function() {
/*
		var p=undefined;
		if (window.clipboardData) {
			p = window.clipboardData.getData("Text");
		} else if(window.netscape) {
			p = this.mozilla_clipboard();
		}
		if (p) {
			this.debug('Pasted');
			this.transporter.queue(encodeURIComponent(p));
		}
*/
		this.debug('Pasted');
	},
	//this is for handling special, non text keys
	keydown: function(e) {
		var kc = (e.keyCode ? e.keyCode : e.which);
		var k = '';

		if (kc==9) k=String.fromCharCode(9);  // Tab
		else if (kc==8) k=String.fromCharCode(127);  // Backspace
		else if (kc==27) k=String.fromCharCode(27); // Escape
		else {
			if (kc==33) k="[5~";        // PgUp
			else if (kc==34) k="[6~";   // PgDn
			else if (kc==35) k="[4~";   // End
			else if (kc==36) k="[1~";   // Home
			else if (kc==37) k="[D";    // Left
			else if (kc==38) k="[A";    // Up
			else if (kc==39) k="[C";    // Right
			else if (kc==40) k="[B";    // Down
			else if (kc==45) k="[2~";   // Ins
			else if (kc==46) k="[3~";   // Del
			else if (kc==112) k="[[A";  // F1
			else if (kc==113) k="[[B";  // F2
			else if (kc==114) k="[[C";  // F3
			else if (kc==115) k="[[D";  // F4
			else if (kc==116) k="[[E";  // F5
			else if (kc==117) k="[17~"; // F6
			else if (kc==118) k="[18~"; // F7
			else if (kc==119) k="[19~"; // F8
			else if (kc==120) k="[20~"; // F9
			else if (kc==121) k="[21~"; // F10
			else if (kc==122) k="[23~"; // F11
			else if (kc==123) k="[24~"; // F12
			if (k.length) {
				k = String.fromCharCode(27)+k;
			}
		}
		if(k.length) {
			e.preventDefault();
			this.transporter.queue(k);
			return false;
		}
	},
	keypress: function(e) {
		var kc = (e.keyCode ? e.keyCode : e.which);
		var k = '';

		if (e.altKey) {
//console.log("alt");
			if (kc >= 65 && kc <= 90)
				kc += 32;
			if (kc >= 97 && kc <= 122) {
				k = String.fromCharCode(27) + String.fromCharCode(kc);
			}
		} else if (e.ctrlKey) {
//console.log("ctrl");
			if (kc>=65 && kc<=90) k=String.fromCharCode(kc-64); // Ctrl-A..Z
			else if (kc>=97 && kc<=122) k=String.fromCharCode(kc-96); // Ctrl-A..Z
			else if (kc==54)  k=String.fromCharCode(30); // Ctrl-^
			else if (kc==109) k=String.fromCharCode(31); // Ctrl-_
			else if (kc==219) k=String.fromCharCode(27); // Ctrl-[
			else if (kc==220) k=String.fromCharCode(28); // Ctrl-\
			else if (kc==221) k=String.fromCharCode(29); // Ctrl-]
			else if (kc==219) k=String.fromCharCode(29); // Ctrl-]
			else if (kc==219) k=String.fromCharCode(0);  // Ctrl-@
		} else {
			if (kc==8)
				k = String.fromCharCode(127);  // Backspace
			else {
				k = String.fromCharCode(kc);
			}
		}

		if(k.length) {
			e.preventDefault();
			this.transporter.queue(k);
		}
		return false;
	},
	sledStatus: function(class_name) {
		this.sled.attr('class', class_name);
	},

//triggered by transporter
	sending: function(class_name) {
		return this.sledStatus(class_name);
	},
	sendSuccess: function(content) {
		this.dterm.html(content);
		return this.sledStatus('off');
	}
}
