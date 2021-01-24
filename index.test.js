const index = require('./index');

test('Future timestamp', () => {
    const mockTimestamps = 2611433105;
    
    expect(index.timestampIsFuture(mockTimestamps)).toBe(true);  
})

test('Past timestamp', () => {
    const mockTimestamps = 1611433105;

    expect(index.timestampIsFuture(mockTimestamps)).toBe(false);  
})

test('Ends with -st- test', () => {
    var rank = 21;

    expect(index.modifyPlayerRank(rank)).toEqual("21st");
})

test('Ends with -nd- test', () => {
    var rank = 22;

    expect(index.modifyPlayerRank(rank)).toEqual("22nd");
})

test('Ends with -rd- test', () => {
    var rank = 23;

    expect(index.modifyPlayerRank(rank)).toEqual("23rd");
})

test('Ends with -th- test', () => {
    var rank = 5;

    expect(index.modifyPlayerRank(rank)).toEqual("5th");
})