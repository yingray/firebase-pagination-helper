import { map } from 'rxjs/operators';

export const mapSnapToArray = snap => {
  const arr = [];
  snap.forEach(s => {
    arr.push({ key: s.key, ...s.val() });
  });
  return arr;
};

export const reverseSnapToArray = snap => {
  const arr = [];
  snap.forEach(s => {
    arr.splice(0, 0, { key: s.key, ...s.val() });
  });
  return arr;
};

const getQueryForPagedList = (ref, limit, offset, orderBy, previousPage, currentSources, offsetValue) => {
  let limitMethod = orderBy.desc ? 'limitToLast' : 'limitToFirst';
  if (previousPage) {
    limitMethod = orderBy.desc ? 'limitToFirst' : 'limitToLast';
  }
  let query = ref[limitMethod](limit + (offset ? 1 : 0));
  if (!orderBy.method) {
    query = query.orderByKey();
  } else if (orderBy.method === 'orderByKey' || orderBy.method === 'orderByValue') {
    query = query[orderBy.method]();
  } else {
    if (!orderBy.name) {
      throw new Error('lack of orderBy.name');
    }
    query = query[orderBy.method](orderBy.name);
  }
  if (offset) {
    query = offset.value ? query[offset.method](offset.value, offset.key) : query[offset.method](offset.key);
  }
  if (!currentSources && offsetValue) {
    query = query.startAt(offsetValue);
  }
  return query;
};

export const queryNextPagedList = (ref, limit, currentSources, orderBy, method = 'once', offsetValue) => {
  const offset = currentSources && {
    method: orderBy.desc ? 'endAt' : 'startAt',
    value: offsetValue || currentSources.slice(-1)[0][orderBy.name],
    key: currentSources.slice(-1)[0].key,
  };
  const query = getQueryForPagedList(ref, limit, offset, orderBy, false, currentSources, offsetValue);
  return executeQuery(query, method).pipe(
    map(orderBy.desc ? reverseSnapToArray : mapSnapToArray),
    map(result => (offset ? result.slice(1) : result)),
  );
};

export const queryPreviousPagedList = (ref, limit, currentSources, orderBy, method, offsetValue) => {
  const offset = currentSources && {
    method: orderBy.desc ? 'startAt' : 'endAt',
    value: offsetValue || currentSources.slice(0, 1)[0][orderBy.name],
    key: currentSources.slice(0, 1)[0].key,
  };
  const query = getQueryForPagedList(ref, limit, offset, orderBy, true, currentSources, offsetValue);
  return executeQuery(query, method).pipe(
    map(orderBy.desc ? reverseSnapToArray : mapSnapToArray),
    map(result => (offset ? result.slice(0, -1) : result)),
  );
};

export const executeQuery = (query, method, eventType = 'value') => {
  if (method === 'once') {
    return from(query.once(eventType));
  }
  return fromEvent(query, eventType);
};

export const getOrderBy = (method = 'orderByKey', name, desc = false) => ({ method, name, desc });
