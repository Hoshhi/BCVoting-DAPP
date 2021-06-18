export const getAll = async (f, c) => {
    let res = [];
    for (let i = 0; i < c; ++i) {
        res.push(await f(i));
    }
    return res;
}