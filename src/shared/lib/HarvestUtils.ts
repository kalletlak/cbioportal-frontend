function extractListObjectFromLocalStorage(property:string){
    let _obj = localStorage.getItem(property);
    return (_obj === null)? [] : JSON.parse(_obj);
}

export function localStorageUtil(property:string, operation_type:string, sample:string) {
    switch (operation_type) {
        case 'add':
        {
            let _data:string[] = extractListObjectFromLocalStorage(property);
            _data.push(sample);
            localStorage.setItem(property, JSON.stringify(Array.from(new Set(_data))));
            return true;
        }

        case 'delete':
        {
            let _data:string[] = extractListObjectFromLocalStorage(property);
            let filtered_arr = _data.filter(function(el) {
                return el !== sample;
            });
            localStorage.setItem(property, JSON.stringify(filtered_arr));
            return true;
        }


        case 'check':
        {
            let _data = new Set(extractListObjectFromLocalStorage(property));
            return Array.from(_data).indexOf(sample) >= 0 || false;
        }

        case 'clear':
        {
            localStorage.setItem(property, JSON.stringify([]));
            return true;
        }

        case 'get':
        {
            let _data:string[] = extractListObjectFromLocalStorage(property);
            return Array.from(new Set(_data));
        }

        default:
        {
            localStorage.setItem(property, JSON.stringify([]));
            return true;
        }
    }
}
