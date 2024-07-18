class Decoder {
	constructor(bytes, variables) {
		this.bytes = bytes;
		this.temporary_object = {};
		this.data_object = {};
		if (variables.devEUI) { this.data_object.devEUI = variables.devEUI; }
		if (this.bytes[0] == 0x39) {
			this.data_object.logger_battery_percentage = parseInt(this.bytes[1], 16);
		} else {
			this.assignBytes();
			this.bytes2HexString();
			this.handleTwosComplement();
			this.formatDataObject();
		}
	}

	assignBytes() {
		this.temporary_object.temperature = this.bytes.slice(3, 7);
		this.temporary_object.vwc = this.bytes.slice(7, 11);
		this.temporary_object.ec = this.bytes.slice(13, 17);
		this.temporary_object.salinity = this.bytes.slice(17, 21);
		this.temporary_object.tds = this.bytes.slice(24, 28);
		this.temporary_object.epsilon = this.bytes.slice(28, 32);
	}

	bytes2HexString() {
		Object.entries(this.temporary_object).forEach(([key, value]) => {
			let hexString = '';
			for (let i = 0; i < value.length; i++) {
				let num = value[i];
				let tmp = num.toString(16);
				if (tmp.length === 1) {
					tmp = '0' + tmp;
				}
				hexString += tmp;
			}
			this.temporary_object[key] = hexString;
		});
	}

	handleTwosComplement(divisor = 1000) {
		Object.entries(this.temporary_object).forEach(([key, value]) => {
			let strReverse = bigEndianTransform(value)
			let str2 = toBinary(strReverse)
			if (str2[0] === '1') {
				let invertedBinary = str2.split('').map(bit => bit === '1' ? '0' : '1').join('');
				let positiveValue = parseInt(invertedBinary, 2) + 1;
				this.temporary_object[key] = -positiveValue / divisor;
			} else {
				this.temporary_object[key] = parseInt(str2, 2) / divisor;
			}
		});
	}

	formatDataObject() {
		let temperature = ((this.temporary_object.temperature) / 100).toFixed(2)
		let vwc = ((this.temporary_object.vwc) / 100).toFixed(2)
		let epsilon = ((this.temporary_object.epsilon) / 100).toFixed(2)
		this.data_object.temperature = parseFloat(temperature)
		this.data_object.vwc = parseFloat(vwc)
		this.data_object.epsilon = parseFloat(epsilon)
		this.data_object.ec = this.temporary_object.ec
		this.data_object.salinity = this.temporary_object.salinity
		this.data_object.tds = this.temporary_object.tds
	}
}

function bigEndianTransform(data) {
	let dataArray = []
	for (let i = 0; i < data.length; i += 2) {
		dataArray.push(data.substring(i, i + 2))
	}
	return dataArray
}

function toBinary(arr) {
	let binaryData = arr.map((item) => {
		let data = parseInt(item, 16)
			.toString(2)
		let dataLength = data.length
		if (data.length !== 8) {
			for (let i = 0; i < 8 - dataLength; i++) {
				data = `0` + data
			}
		}
		return data
	})
	let ret = binaryData.toString()
		.replace(/,/g, '')
	return ret
}

function decodeUplink(input) {
	const decoder = new Decoder(input.bytes, input.variables)
	return {
		data: decoder.data_object
	};
}

function encodeDownlink(input) {
	const hexString = input.data.replace(/\s/g, '');
	const byteLength = hexString.length / 2;
	const bytes = new Uint8Array(byteLength);
	for (let i = 0; i < byteLength; i++) {
		bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
	}
	return {
		bytes: bytes
	};
}
