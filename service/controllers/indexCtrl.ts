import express, { Request, Response, NextFunction } from 'express';

const showService = (req: Request, res: Response) => {
  return res.render('index', {
    title: 'Geralt Service',
    content: "This is Unic's (previously Nufutu) backend service."
  });
}

export {
  showService
}
