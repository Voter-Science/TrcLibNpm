

// Private utility functions 
class Utility {
    private static startsWith(str: string, word: string): boolean {
        return str.lastIndexOf(word, 0) === 0;
    }

    public static addQuery(q: string, key: string, value: string): string {
        if (value == null || value == undefined) {
            return q;
        }
        if (q == null || q == undefined) {
            q = "";
        }
        if (q.length == 0) {
            q = q + "?";
        } else {
            q = q + "&";
        }
        q = q + key + "=" + encodeURIComponent(value);
        return q;
    }
}