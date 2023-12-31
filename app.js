const mysql = require('mysql');
const express = require('express');
const cors=require("cors");
const jwt = require('jsonwebtoken');
const bodyparser = require('body-parser');
const midtransClient = require('midtrans-client');
const SERVER_KEY = 'SB-Mid-server-3ncEd7F2Y1laYbScl1QNXMpe';
const CLIENT_KEY = 'SB-Mid-client-CdIoeAyfCFXBCy2T';
const mysql2 = require('mysql2/promise');
const moment=require("moment");
const qrcode = require('qrcode-terminal');
const otpGenerator = require('otp-generator')
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config()
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { check,body, validationResult } = require("express-validator");
//const bcrypt = require("bcrypt");
const axios = require('axios');

const clienttwilio = new twilio( process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/*const { Client } = require('whatsapp-web.js');
const client = new Client();

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
	//qrcode.generate(qr)
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();*/

const midtransServerKey = SERVER_KEY;
const midtransBaseUrl = 'https://api.sandbox.midtrans.com/v2';

const bcrypt = require("bcryptjs");
let refreshTokens = []

const { OAuth2Client } = require('google-auth-library');
/*const db = mysql.createConnection({
    host: '147.139.175.120',
    user: 'root',
    password: 'Dwipaadmin2022',
    database: 'MYDEPOSBY',
    port:3307
});*/
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal',
    port:3306
});
	 const connection = mysql2.createConnection({
     host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal',
    port:3306
  });


db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySql Connected...');
});

const app = express();

app.use(bodyparser.json());
app.use(morgan('dev'));
const corsOptions ={
   origin:'*',
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
   origin:'http://localhost:3000'
}

app.use(cors(corsOptions)) // Use this after the variable declaration

app.listen(4001, () => {
    console.log('Server started on port 4001');
});

//app.use(cors({ credentials:true, origin:'http://localhost:3000' }));
app.use(cookieParser());
app.set('views', 'views');
app.set('view engine', 'ejs');
//app.use(express.static('public'));
app.use(express.urlencoded({extended: false})); // to support URL-encoded POST body


let core = new midtransClient.CoreApi({
  isProduction : false,
  serverKey : SERVER_KEY,
  clientKey : CLIENT_KEY
});


async function connectToDatabase() {
  const dbConfig = {
     host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal',
    port:3306
  };

  const connection = await mysql2.createConnection(dbConfig);
  return connection;
}

/*async function queryDatabase(connection) {
  try {
    const [rows, fields] = await connection.execute('SELECT * FROM your_table');
    console.log('Query Results:', rows);
  } catch (error) {
    console.error('Error executing query:', error);
  }
}

async function closeConnection(connection) {
  try {
    await connection.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error closing connection:', error);
  }
}

async function connectQueryAndClose() {
  const connection = await connectToDatabase();

  try {
    await queryDatabase(connection);
  } finally {
    await closeConnection(connection);
  }
}

// Call the main function
connectQueryAndClose();*/


// Example usage


//const myDatabase = new MySQLDatabase(dbConfig);
const formatDateAndTime = (date) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = date.toLocaleDateString("en-IN");

  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const formattedTime = date.toLocaleTimeString(undefined, timeOptions);
    const formattedDateTime = `${date.toISOString().slice(0, 19).replace('T', ' ')}:${date.getMilliseconds()}`;

  return formattedDateTime;
  //return `${formattedDate} ${formattedTime}`;
};

function padTo2Digits(num) {
  return num.toString().padStart(2, '0');
}

function formatDate1(date) {
  return (
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate()),
    ].join('-') +
    ' ' +
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds()),
	   padTo2Digits(date.getMilliseconds()),
    ].join(':')
  );
}








async function getPaymentStatus(orderId,usermail) {

  const endpoint = `${midtransBaseUrl}/${orderId}/status`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(midtransServerKey + ':').toString('base64')}`,
  };

  try {
    //   console.log('id order',endpoint)
    const response = await axios.get(endpoint, { headers });

    if (response.status === 200) {
    //  console.log(`Payment status for order ID ${orderId}: ${response.data.transaction_status}`);
	 // console.log('data response', response.data.status_code)
    	  console.log('data response', response.data)

	                  let statusbru='';
                    let tglbayar=null;
	                  if(Number(response.data.status_code)===407 && response.data.transaction_status==='expire'){
						  statusbru='cancel'
                          tglbayar=null;
					  }else if(Number(response.data.status_code)===201 && response.data.transaction_status=='pending'){
						   statusbru='Pending'
                           tglbayar=null;
					  }else if(Number(response.data.status_code)===200 && response.data.transaction_status=='settlement'){
						   statusbru='success'
                           tglbayar=response.data.settlement_time;
					  }else if(Number(response.data.status_code)===200 && response.data.transaction_status=='cancel'){
						   statusbru='cancel'
                           tglbayar=null;
					  }else{
						  statusbru='Pending';
                          tglbayar=null;
					  }
					  let vanumber=null;
					  let akun='';
					  
					    if(response.data.payment_type==='cstore'){
							     vanumber=response.data.payment_code;		
								 akun=response.data.store;
						}else if(response.data.payment_type==='bank_transfer'){
							     vanumber=response.data.va_numbers[0].va_number;		
								 akun=response.data.va_numbers[0].bank;
						}else if(response.data.payment_type==='qris'){
							     vanumber=null;		
								 akun=response.data.payment_type;
						}
                          
								let exptime=response.data.expiry_time;			
                                let tglcreate=response.data.transaction_time;							
										  
                  //console.log('tanggal bayar',tglbayar)
	                	        let sqlupdateDETILorder="update pembayaran set status=?,kodegatepay=?,tgl=?,akunbank=?,expiretime=?,tgltransaksi=?  where id_penyewa=? and idpembayaran=?";
								db.query(sqlupdateDETILorder,[statusbru,vanumber,tglbayar,akun,exptime,tglcreate,usermail,orderId], (err2, result2) => {
									if (err2){throw err2
									}else{
										      let sqlgetnoinv="select noinvoice from invpembayaran where nopembayaran=?"
											   db.query(sqlgetnoinv,[orderId], (errnoinv, resultnoinv) => {
												     if(errnoinv){
														 console.log('terjadi kesalahan retrive no invoice')
													 }else{
														 resultnoinv.map(itemnoinv=>{
															   let dataasli=itemnoinv.noinvoice
															   let pecah=dataasli.split('/')
															   let parttglinv='-'
															   if(tglcreate){
																   let pecahwaktu=tglcreate.split(' ')
																   let pecahwaktu2=pecahwaktu[0].split('-')
																      parttglinv=pecahwaktu2[0]+pecahwaktu2[1]+pecahwaktu2[2]
															   }else{
																      parttglinv='-'
															   }
															   
															   let formatinv=pecah[0]+'/'+parttglinv+'/'+pecah[2]+'/'+pecah[3]													   
															   let sqlinv="update invpembayaran set tglinvoice=?,noinvoice=?,status=? where nopembayaran=?"
															   db.query(sqlinv,[tglcreate,formatinv,statusbru,orderId], (errinvup, resultupdateInv) => {
																 })
														 })
													 }
												     
											   })
										
										
									          let sql = 'SELECT * FROM pembayaran where id_penyewa=? and idpembayaran=?';
                                              db.query(sql,[usermail,orderId], (err, resultbayar) => {
                                                  if (err){
													  throw err;
												  }else{
												    	 resultbayar.map(result => {
														   let sqlupdateorder="update orderan set status=? where id_penyewa=? and id_order=?";
															 db.query(sqlupdateorder,[statusbru,usermail,result.idorder], (err1, resultupdate) => {
															 })
													  });
												  }
											});


									}
								})
    } else {
      console.error(`Failed to retrieve payment status for order ID ${orderId}. Status code: ${response.status}`);
    }
  } catch (error) {
    console.error(`An error occurred while retrieving status for order ID ${orderId}:`, error.message);
  }
}

app.get('/getdatapenyewa', (req, res) => {

  let {usermail,nama} = req.query
//console.log(param);

    let sql = 'select * from penyewa where email=? and nama=?';

     db.query(sql,[usermail,nama], (err, result) => {
        if (err) throw err;
        //console.log(result);
		result.map(hasil=>{
			  res.send({
			    nohpuser:hasil.NoHp,
				namauser:hasil.nama,
				alamatuser:hasil.alamat,
				prshuser:hasil.company			
		      });
		})
       
    });
});


async function GetVanumber(idorderpay) {
	  const endpoint = `${midtransBaseUrl}/${idorderpay}/status`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(midtransServerKey + ':').toString('base64')}`,
  };

  try {
    //   console.log('id order',endpoint)
    const response = await axios.get(endpoint, { headers });
    if (response.status === 200) {
		    let vanumber=response.data.va_numbers[0].va_number;
			return vanumber;
    } else {
      console.error(`Failed to retrieve payment status for order ID ${idorderpay}. Status code: ${response.status}`);
    }
  } catch (error) {
    console.error(`An error occurred while retrieving status for order ID ${idorderpay}:`, error.message);
  }
	
  //const result = Math.floor(Math.random() * number);
  //return result;
}

app.post('/caridatapembayaran',(req,res)=>{
	//console.log('data user pembayaran',req.body);
	       let {emailuser}=req.body;
		   caridatapembayaran()
		   async function caridatapembayaran() {
		   const connection = await connectToDatabase();
		   try {
			   
			   const [subRowbayar, subFieldsbayar] = await connection.query("select distinct idpembayaran,expiretime,tgltransaksi,akunbank,kodegatepay from pembayaran where id_penyewa=? and tgl is null and status='Pending'", [emailuser]);
			   //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
			   const resultbayar = await Promise.all(subRowbayar.map(async (rowbayar)=>{
				   
				   const [rowbayar2,subfieldsbayar2]=await connection.query("select D.jamawal as jamawal,D.jamakhir as jamakhir, LAP.nama as lapangan, P.jumlahbayar as jumlahbayar, O.tgl_order as ordertgl from detail_order D join orderan O on O.id_order=D.id_order JOIN lapangan LAP on LAP.ID=D.idlapangan join pembayaran P on O.id_order=P.idorder where O.id_penyewa =? and P.idpembayaran=?",[emailuser,rowbayar.idpembayaran])
				  
                   const resultdetail = await Promise.all(rowbayar2.map(async (rowdet)=>{
						   return {
							   jamawal:rowdet.jamawal,
							   jamakhir:rowdet.jamakhir,
							   namalap:rowdet.lapangan,
							   ordertgl:rowdet.ordertgl,
							   jumlahbayar:rowdet.jumlahbayar
							   }
							
				   })) 
				//   console.log('datapembayaran.................',resultdetail)
				   const [subRowdetil, subFieldsdetil] = await connection.query('select * from pembayaran where  idpembayaran=?', [rowbayar.idpembayaran]);
			      //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
				   let total=0;
			       const resultdetil = await Promise.all(subRowdetil.map(async (rowdetil)=>{
				        total+=Number(rowdetil.jumlahbayar)
					//	return total
			       })) 
				   return {
					   tgltransaksi:rowbayar.tgltransaksi,
					   expiretime:rowbayar.expiretime,
					   akunbank:rowbayar.akunbank,
					   kodegatepay:rowbayar.kodegatepay,
					   jumlahbayar:total,
					   detilorder:resultdetail
				   }
			   })) 
			   res.send(resultbayar)
		   } catch (err) {
			console.error(err);
		   } finally {
			await connection.end();
		   }
	 } 
		 
	     /*let sql = "SELECT * from pembayaran where id_penyewa=? and tgl is null and status='Pending'";
			  db.query(sql,[emailuser] , (err, result5) => {
				if(err){
				  res.send(err)
				  //console.log(err);
				}else{		   
										   
					res.send(result5)
					result5.map(resultinfo => {						
						//  getPaymentStatus(resultddd.idpembayaran,mailuser);
						//console.log(resultinfo)
						res.send({
							vanumber:resultinfo.kodegatepay,
							tglexpire:resultinfo.expiretime,
							totalbayar:resultinfo.jumlahbayar,
							akun:resultinfo.akunbank,
							tglcreate:resultinfo.tgltransaksi
						})			
					})
				}
			  })*/
})

app.post('/caridatatransaksi',(req,res)=>{
	//console.log('data transaksi', req.body)
	let {emailuser}=req.body
	let sts=['success'];
	caridatatransaksi()
	
		async function caridatatransaksi() {
		   const connection = await connectToDatabase();
		   try {
			   const [subRowbayar, subFieldsbayar] = await connection.query('select distinct idpembayaran,tgltransaksi,status,id_penyewa from pembayaran where id_penyewa=? and tgl is not null and status in (?)', [emailuser,sts]);
			   //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
			   const resultbayar = await Promise.all(subRowbayar.map(async (rowbayar)=>{
				   
				   const [rowbayar2,subfieldsbayar2]=await connection.query("select D.jamawal as jamawal,D.jamakhir as jamakhir, LAP.nama as lapangan, P.jumlahbayar as jumlahbayar, O.tgl_order as ordertgl from detail_order D join orderan O on O.id_order=D.id_order JOIN lapangan LAP on LAP.ID=D.idlapangan join pembayaran P on O.id_order=P.idorder where O.id_penyewa =? and P.idpembayaran=?",[emailuser,rowbayar.idpembayaran])
				  
                   const resultdetail = await Promise.all(rowbayar2.map(async (rowdet)=>{
						   return {
							   jamawal:rowdet.jamawal,
							   jamakhir:rowdet.jamakhir,
							   namalap:rowdet.lapangan,
							   ordertgl:rowdet.ordertgl,
							   jumlahbayar:rowdet.jumlahbayar
							   }
							
				   })) 
				   
				   const [rowInv,subFieldinv]=await connection.query('select * from invpembayaran where nopembayaran=?',[rowbayar.idpembayaran])
				   const resultinvoice=await Promise.all(rowInv.map(async(resultinv2)=>{
					   return resultinv2.noinvoice
						
				   }))
				   
				   const [subRowdetil, subFieldsdetil] = await connection.query('select * from pembayaran where  idpembayaran=?', [rowbayar.idpembayaran]);			    
				   let total=0;
			       const resultdetil = await Promise.all(subRowdetil.map(async (rowdetil)=>{
				        total+=Number(rowdetil.jumlahbayar)
					//	return total
			       })) 
				   
				   return {					  
						  status:rowbayar.status,
					      tgltransaksi:rowbayar.tgltransaksi,
						  idpenyewa:rowbayar.id_penyewa,
						  idpembayaran:rowbayar.idpembayaran,
						  jumlahbayar:total,
						  invno:resultinvoice,
						  detilorder:resultdetail					 
				   }
			   })) 
			   //console.log('data transaksi',resultbayar)
			   
			   res.send(resultbayar)
		   
		   } catch (err) {
			console.error(err);
		   } finally {
			await connection.end();
		   }
		}

	/*let sql="select * from pembayaran where id_penyewa=? and tgl is not null and status in (?)"
	       db.query(sql,[emailuser,sts],(err,result2)=>{
			 //  res.send(result2)
			   const datatransaksi=[]
			   const hasil={}
			      result2.map(itemres =>{
				   let sqltransaksi="select D.jamawal as jamawal,D.jamakhir as jamakhir, LAP.nama as lapangan from detail_order D join orderan O on O.id_order=D.id_order JOIN lapangan LAP on LAP.ID=D.idlapangan where O.id_penyewa =? and D.id_order=?"
				   db.query(sqltransaksi,[itemres.id_penyewa,itemres.idorder],(err4,result4)=>{
					    result4.map(itemdet =>{
							 datatransaksi.push({jamawal:itemdet.jamawal,jamakhir:itemdet.jamakhir,namalap:lapangan})
						})	
                        return datatransaksi						
				   })
				    hasil={status:itemres.status,tgltransaksi:itemres.tgltransaksi,detilorder:datatransaksi}
					return hasil
			   })
			   
			  // res.send(hasil);
		   })*/
})

app.post('/getstatusorder',(req,res)=>{
  let {idpayorder,emailuser}=req.body;
 console.log('data body',req.body);
     let sql = "SELECT * from pembayaran where idpembayaran=? and id_penyewa=?";
                          db.query(sql,[idpayorder,emailuser] , (err, result5) => {
                            if(err){
                              res.send(err)
                              //console.log(err);
                            }else{
								
								result5.map(resultinfo => {
									
									//  getPaymentStatus(resultddd.idpembayaran,mailuser);
									//console.log(resultinfo)
									res.send({
										vanumber:resultinfo.kodegatepay,
										tglexpire:resultinfo.expiretime,
										totalbayar:resultinfo.jumlahbayar,
										akun:resultinfo.akunbank
									})
						
								})
							}
						  })
 /* const endpoint = `${midtransBaseUrl}/${idpayorder}/status`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(midtransServerKey + ':').toString('base64')}`,	
  };
    try {
    //   console.log('id order',endpoint)
    const response =  axios.get(endpoint, { headers });
    if (response.status === 200) {
		
		    let vanumber=response.data.va_numbers[0].va_number;
			let expire=response.data.expiry_time;
			let grosamount=response.data.gross_amount;
			let tgltransaksi=response.data.transaction_time;
		   res.send({totwaktu:61000})
    } else {
      console.error(`Failed to retrieve payment status for order ID ${idpayorder}. Status code: ${response.status}`);
    }
  } catch (error) {
    console.error(`An error occurred while retrieving status for order ID ${idpayorder}:`, error.message);
  }*/
  

})

////payment code BCA 26145640350
app.post('/updatepayment',(req,res)=>{
	let {mailuser,idordernya}=req.body
	console.log('data ubah bayar',req.body)

	  let snap = new midtransClient.Snap({
				isProduction : false,
				serverKey : SERVER_KEY,
				clientKey : CLIENT_KEY
			  });

let idnya=[];
//const orderId = 'order-20230929174955201';  // Use the correct order ID format
idordernya.map(resultddd => {			   
	            getPaymentStatus(resultddd.idpembayaran,mailuser);
})


})

app.post('/updateDatabayar',(req,res)=>{
	const {user,mail,amt,listorder} = req.body;
	console.log(req.body)
		let sqlupdateorder="update orderan set status='Pending' where id_penyewa=? and id_order in (?)";
					db.query(sqlupdateorder,[mail,listorder], (err1, result) => {

						if (err1){throw err1}else{

        //      const endpoint = `${midtransBaseUrl}/${idpembayaran}/status`;

        /*      const headers = {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(midtransServerKey + ':').toString('base64')}`,
              };

            try {
                //   console.log('id order',endpoint)
                const response =  axios.get(endpoint, { headers });

                if (response.status === 200) {
                  //let sqlupdatebayar="update pembayaran";
                  let vanumber=response.data.va_numbers[0].va_number;*/
                    let sqlupdateDETILorder="update pembayaran set status='Pending' where id_penyewa=? and idorder in (?)";
                    db.query(sqlupdateDETILorder,[mail,listorder], (err2, result2) => {

                      if (err2){throw err2
                        }else{

                          let sql = "SELECT  pembayaran.idpembayaran,lapangan.Nama,orderan.id_order, SUBSTRING(detail_order.jamawal, 1, 5) AS jamawal,SUBSTRING(detail_order.jamakhir, 1, 5) AS jamakhir, FORMAT(pembayaran.jumlahbayar, 2) as jumlahbayar  FROM pembayaran join orderan on orderan.id_order=pembayaran.idorder join detail_order on detail_order.id_order=pembayaran.idorder JOIN lapangan ON lapangan.ID=detail_order.idlapangan where pembayaran.status <> 'cancel' and pembayaran.status <> 'Pending' and pembayaran.status <> 'success' and pembayaran.id_penyewa=?";
                          db.query(sql,[mail] , (err, result5) => {
                            if(err){
                              res.send(err)
                              //console.log(err);
                            }else{
                               // res.send(result5);
                               //	const datapayment={
                               //	response:JSON.stringify(transactionToken)
                               //}
                               //let tokennya = transactionToken
                               // console.log('transactionToken:',datapayment, transactionToken)
                               // const datatransaksi={message:'Berhasil',datapayment,token:transactionToken,datasisa:result5}
                                const databalik={datasisa:result5}
                                res.send(databalik)
                            }
                          });
                          } ;
                      // res.send('SUKSESS');
                    });
              /*  } else {
                  console.error(`Failed to retrieve payment status for order ID ${idpembayaran}. Status code: ${response.status}`);
                }
              } catch (error) {
                console.error(`An error occurred while retrieving status for order ID ${idpembayaran}:`, error.message);
              }*/


						} ;
					  // res.send('SUKSESS');
					});
})

app.post('/tambahorderpay',async(req,res)=>{
		console.log('data tambahorderpay',req.body)
	//	const {idorderpay,amt,unamepelanggan,idpelanggan,lapangan,jamawalorder,jamakhirorder,tglorder}=req.body;
   // Call the main function

		
})

                 
app.post('/createinvoice',async(req,res)=>{
	
	console.log('parameter untuk invoice',req.body)
     const {emailuser,idorderpayment}=req.body
	
	const connection = await connectToDatabase();
  try {       
 
	   const [subRowdetil, subFieldsdetil] = await connection.query('select * from pembayaran where  idpembayaran=?', [idorderpayment]);
	   let total=0;
	   const resultdetil = await Promise.all(subRowdetil.map(async (rowdetil)=>{
			total+=Number(rowdetil.jumlahbayar)
		//	return total
	   })) 
		
	  const [cariMaxnoinv, subFieldMaxnoinv] = await connection.query('SELECT IFNULL(MAX(no),0) as nomor FROM invpembayaran');
			  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
	 const IDMAX = await Promise.all(cariMaxnoinv.map(async (rowmaxno)=>{
	   return rowmaxno.nomor
	 }))
	 let countNumb=Number(IDMAX)+1	
	 let noinvoice0='INV/-/SATRIAFUTSAL/'+countNumb
	 let sqlinvoice= `INSERT INTO invpembayaran(noinvoice,nopembayaran,totalamount,tglinvoice,status) VALUES ('${noinvoice0}', '${idorderpayment}', '${total}',null,'')`;
		db.query(sqlinvoice, async(errInv, resultInv) => {
			
		})		
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
})				 
											
app.post('/updatepembayaranlangsung',async(req,res)=>{
	const {emailuser,idorderpayment}=req.body;
	 let caridata="select idpembayaran from pembayaran where id_penyewa=?";
		 db.query(caridata,[emailuser], (err0, resultcari) => {
				 if(err0){

				 }else{
			   resultcari.map(async idpel => {
					  const endpoint = `${midtransBaseUrl}/${idpel.idpembayaran}/status`;

					  const headers = {
						'Content-Type': 'application/json',
						Authorization: `Basic ${Buffer.from(midtransServerKey + ':').toString('base64')}`,
					  };

					  try {
						//   console.log('id order',endpoint)
						const response = await axios.get(endpoint, { headers });
						if (response.status === 200) {							
							
								let vanumber=response.data.va_numbers[0].va_number;
								let akun=response.data.va_numbers[0].bank;
								let exptime=response.data.expiry_time;			
                                let tglcreate=response.data.transaction_time;							
										  
												let sqlupdateorder="update pembayaran set kodegatepay=?, expiretime=?,akunbank=?,tgltransaksi=? where id_penyewa=? and idpembayaran=?";
												db.query(sqlupdateorder,[vanumber,exptime,akun,tglcreate,emailuser,idpel.idpembayaran], (err1, resultupdate) => {
													if(err1){
														 res.status(200).json({
															errors: [
															  {
																tipe:"failed",
																msg: "gagal update pembayaran",
															  },
															],
														  });
													}else{
                                                    
														 res.status(200).json({
															success: [
															  {
																tipe:"success",
																msg: "berhasil update",																			
																
															  },
															],
														  });
													}
												})	  										   
									
								
						} else {
						  console.error(`Failed to retrieve payment status for order ID ${idpel.idpembayaran}. Status code: ${response.status}`);
						}
					  } catch (error) {
						console.error(`An error occurred while retrieving status for order ID ${idpel.idpembayaran}:`, error.message);
					  }
  
			   })
  
  	 }
 })
})											


app.get('/getpaymentlangsung',(req,res)=>{
	console.log('data',req.query)
	const {amt,unamepelanggan,idpelanggan,lapangan,jamawalorder,jamakhirorder,tglorder}=req.query;							
		  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		  ////////////////////////////////////////////////////////PROSES PAYMENT GATWAY MIDTRANS//////////////////////////////////////////////////////////////////////////////////////
		  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		  let snap = new midtransClient.Snap({
				isProduction : false,
				serverKey : SERVER_KEY,
				clientKey : CLIENT_KEY
			  });
			  
			const formattedDateTime = formatDate1(new Date());
			let bersihdate=formattedDateTime.replace(/[-]/g, '');
			let bersihdate2=bersihdate.replace(/[:]/g, '');
			let bersihdate3=bersihdate2.replace(/[ ]/g, '');
		//	console.log('tanggal',bersihdate3)
	        let idpay="order-"+bersihdate3;
			let parameter = {
			"transaction_details": {
			  "order_id": "order-"+bersihdate3,
			  "gross_amount": amt
			}, "credit_card":{
			  "secure" : true
			},customer_details: {
			  first_name:unamepelanggan,
			  email: idpelanggan,
			},
		  };
		  
		    snap.createTransactionToken(parameter).then((transactionToken)=>{			
					connectQueryAndClose(transactionToken)
			})
			
			 async function connectQueryAndClose(tokennya) {
											  const connection = await connectToDatabase();
												 try {
																
																 let jam1=null;
																 let jam2=null;
																 let jamcout1=0;
																 let jamcout2=0;
																 let pecahjm=jamawalorder.split(' ');
																 if(pecahjm[1]==='PM'){
																	 let partjam=pecahjm[0].split(':');
																	  let bagjam1=0;
																	 if(Number(partjam[0])===12){
																		 bagjam1=Number(partjam[0]);
																	 }else{
																		 bagjam1=Number(partjam[0])+12;
																	 }
																	 jamcout1=bagjam1;
																	 jam1=bagjam1+':00:00'
																 }else{
																	 let partjmx1=pecahjm[0].split(':')
																	 jam1=partjmx1[0]+':00:00';
																	 jamcout1=Number(partjmx1[0]);
																 }

																 let pecahjm2=jamakhirorder.split(' ');
																 if(pecahjm2[1]==='PM'){
																	 let partjam2=pecahjm2[0].split(':');
																	   let bagjam2=0;
																	 if(Number(partjam2[0])===12){
																		 bagjam2=Number(partjam2[0]);
																	 }else{
																		 bagjam2=Number(partjam2[0])+12;
																	 }
																	 jam2=bagjam2+':00:00'
																	 jamcout2=bagjam2;
																 }else{
																	   let partjmx2=pecahjm2[0].split(':')
																	   if(Number(partjmx2[0])===12){
																		   let jumjam=Number(partjmx2[0])+12;
																			jam2=jumjam+':00:00';
																			 jamcout2=Number(partjmx2[0]);
																	   }else{
																		   jam2=partjmx2[0]+':00:00';
																			jamcout2=Number(partjmx2[0]);
																	   }
																 }
																 const [generateID,subfieldsId]=await connection.query('SELECT max(no) as nomor from orderan');
																 const Maxidorder=await Promise.all(generateID.map(async(rowmaxid)=>{
																	  return rowmaxid.nomor
																 }))						
																let nourut=Number(Maxidorder)+1
																let idorderr='order'+nourut;
															  //  console.log('nomor maximal',listpass)
																	   
																let sqlorder= `INSERT INTO orderan(id_order,tgl_order,id_penyewa,status) VALUES ('${idorderr}', '${tglorder}', '${idpelanggan}','Pending')`;
																db.query(sqlorder, async(errOrder, resultOrderan) => {
																	if(errOrder){
																	//res.send(errOrder)
																	//return false;
																	  res.status(200).json({
																		errors: [
																		  {
																		    tipe:"orderan",
																			msg: "gagal simpan orderan",
																		  },
																		],
																	  });
																	}else{
																		let sql2 = `INSERT INTO detail_order(jamawal,jamakhir,idlapangan,id_order) VALUES ('${jam1}', '${jam2}', '${lapangan}','${idorderr}')`;
																		db.query(sql2, async(err2, result2) => {
																			if(err2){
																				//res.send(err2)
																					//return false;
																					 res.status(200).json({
																						errors: [
																						  {
																							tipe:"detorder",
																							msg: "gagal simpan detail order",
																						  },
																						],
																					  });
																				}else{
																			//	  let vanumberpay=await GetVanumber(idorderpay);
																				 let sqlbayar = `INSERT INTO pembayaran(idpembayaran,idorder,id_penyewa,status,jumlahbayar,tgl,kodegatepay,expiretime,akunbank,tgltransaksi) VALUES ('${idpay}', '${idorderr}', '${idpelanggan}','Pending','${amt}',null,null,null,'',null)`;
																				 db.query(sqlbayar, async(errbayar, resultbayar) => {
																				
																					 if(errbayar){
																						 //console.log('errorrrrrrrrrrrrrrrrrrrrrrrrrrrrrr')
																						// res.send(errbayar)
																						//	return false;
																								 res.status(200).json({
																						errors: [
																						  {
																							tipe:"pembayaran",
																							msg: "gagal simpan pembayaran",
																						  },
																						],
																					  });
																					 }else{
																							//	return true;
																						   res.send({token:tokennya,idayment:idpay})   
																					 /* res.status(200).json({
																						success: [
																						  {
																							token:tokennya,																						
																						  },
																						],
																					  });*/
																					 }
																				 })
																			}
																										 
																		})
																	}
																})
											  } catch (err) {
												console.error(err);
											  } finally {
												await connection.end();
											  }

											}	
})

app.post('/updateordercancel',(req,res)=>{
	//console.log('data order cancel', req.body)
	let {emailuser}=req.body;
	let deleteorder="select idorder from pembayaran where id_penyewa=? and kodegatepay is null and tgltransaksi is null ";
	db.query(deleteorder,[emailuser], (err1, resultdel) => {
		if(err1){
				res.status(200).json({
								errors: [
								  {
									tipe:"failfetchpembayaran",
									msg: "gagal simpan pembayaran",
								  },
								],
							});
		}else{
			
			 /*/////////////////////////HAPUS ORDERAN///////////////////*/
			   resultdel.map(async dataval => {
				   
				   
				   console.log('id order pembayaran',dataval.idorder)
					let sql1="delete from orderan where id_order=?"
					db.query(sql1,[dataval.idorder],(err2,resultdelorder)=>{
						if(err2){
						  
						}
					})
					/*/////////////HAPUS DETIL ORDER//////////////////////*/
						let sql2="delete from detail_order where id_order=?";
							db.query(sql2,[dataval.idorder],(err3,resultdeldetil)=>{
								if(err3){
										
								}
							})
			         /*///////////////////////////HAPUS PEMBAYARAN/////////////////*/
					 let sql3="delete from pembayaran where idorder=?";
							db.query(sql3,[dataval.idorder],(err4,resultbayar)=>{
								if(err4){
										
								}
							})
			   })
		}
	})
})

app.get('/getpayment', (req, res) => {
		const {user,mail,amt,listorder} = req.query;
		console.log(req.query);
  if(Number(amt)===0){
		res.status(200).json({
			errors: [
			  {
				msg: "Pilih Order yg mau di bayar"
			  },
			],
		});
  }else{
	  //26145290562  kode pembayaran sept 25 2023 BCA
	    // console.log(parameter)
		/*  va_numbers: [ { bank: 'bca', va_number: '26145003808' } ],
		  payment_amounts: [],
		  transaction_time: '2023-02-03 15:14:07',
		  gross_amount: '200000.00',
		  currency: 'IDR',
		  order_id: 'order-id100000023',
		  payment_type: 'bank_transfer',
		  signature_key: '86bd06b98c4c3b9b1dd389eb237e218d110449c9436a9116e75b2d9d11e6280b5a1c4d8e7a3fe2dc2b4f47756c51f554f55f8170965eb83918882a3000ac23dd',
		  status_code: '200',
		  transaction_id: 'd12fd34a-c0e3-4303-9b9c-1a955846c0fd',
		  transaction_status: 'settlement',
		  fraud_status: 'accept',
		  expiry_time: '2023-02-04 15:14:07',
		  settlement_time: '2023-02-03 15:16:14',
		  status_message: 'Success, transaction is found',
		  merchant_id: 'G788026145*/

		  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		  ////////////////////////////////////////////////////////PROSES PAYMENT GATWAY MIDTRANS//////////////////////////////////////////////////////////////////////////////////////
		  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			  let snap = new midtransClient.Snap({
				isProduction : false,
				serverKey : SERVER_KEY,
				clientKey : CLIENT_KEY
			  });
			const formattedDateTime = formatDate1(new Date());
			let bersihdate=formattedDateTime.replace(/[-]/g, '');
			let bersihdate2=bersihdate.replace(/[:]/g, '');
			let bersihdate3=bersihdate2.replace(/[ ]/g, '');
		//	console.log('tanggal',bersihdate3)
	        let idorder="order-"+bersihdate3;
			let parameter = {
			"transaction_details": {
			  "order_id": "order-"+bersihdate3,
			  "gross_amount": amt
			}, "credit_card":{
			  "secure" : true
			},customer_details: {
			  first_name:user,
			  email: mail,
			},
		  };
		  // create snap transaction token
		  snap.createTransactionToken(parameter).then((transactionToken)=>{
				// pass transaction token to frontend
			 //   res.render('simple_checkout',{
			  //    token: transactionToken,
			 //     clientKey: snap.apiConfig.clientKey
			 //   })
			         const datapayment={
					    response:JSON.stringify(transactionToken)
					 }
		        //   const datatransaksi={message:'Berhasil',datapayment,token:transactionToken, datadetail:parameter}
				// listorder.map(result => {
							   createinvoicekeranjang()
							   let sqlupdateorder="update pembayaran set idpembayaran=? where id_penyewa=? and idorder in (?)";
								 db.query(sqlupdateorder,[idorder,mail,listorder], (err1, resultupdate) => {
									 if(err1){
										res.send(err1)
										//console.log(err);
									}else{
										getPaymentStatus(idorder,mail)
										res.send({token:transactionToken,idorderan:idorder})
									}
								 })
						//  });

			})
			/*snap.transaction.status('order-id100000023')
			.then((response)=>{
				console.log(response)
			});*/
			async function createinvoicekeranjang(){
					const connection = await connectToDatabase();
					  try {       
					 
						   const [subRowdetil, subFieldsdetil] = await connection.query('select * from pembayaran where  idpembayaran=?', [idorder]);
						   let total=0;
						   const resultdetil = await Promise.all(subRowdetil.map(async (rowdetil)=>{
								total+=Number(rowdetil.jumlahbayar)
							//	return total
						   })) 
							
						  const [cariMaxnoinv, subFieldMaxnoinv] = await connection.query('SELECT IFNULL(MAX(no),0) as nomor FROM invpembayaran');
								  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
						 const IDMAX = await Promise.all(cariMaxnoinv.map(async (rowmaxno)=>{
						   return rowmaxno.nomor
						 }))
						 let countNumb=Number(IDMAX)+1	
						 let noinvoice0='INV/-/SATRIAFUTSAL/'+countNumb
						 let sqlinvoice= `INSERT INTO invpembayaran(noinvoice,nopembayaran,totalamount,tglinvoice,status) VALUES ('${noinvoice0}', '${idorder}', '${total}',null,'')`;
							db.query(sqlinvoice, async(errInv, resultInv) => {								
							})		
					  } catch (err) {
						console.error(err);
					  } finally {
						await connection.end();
					  }
			}



  }

});

app.get('/cekpayment2', (req, res) => {
const {mail} = req.query;
    			  	let sqltag="SELECT distinct idpembayaran FROM pembayaran WHERE idpembayaran IS not NULL AND tgl IS NULL and status <> 'cancel' and id_penyewa = ? and expiretime > CURDATE() "
							 db.query(sqltag,[mail], (err, result2) => {
								if (err){

										 res.status(400).json({
										        errors: [
													{
													  msg: "Invalid credentials",
												},
												  ],
										});
								}else{
							
											res.send(result2)
					
								}
					     	   });

})

app.get('/cekpayment', (req, res) => {
		const {mail} = req.query;
		console.log('parameter',req.query);
						  	let sqltag="SELECT distinct idpembayaran FROM pembayaran WHERE idpembayaran IS not NULL AND tgl IS NULL and  kodegatepay IS NULL and expiretime is NULL and id_penyewa = ? "
							 db.query(sqltag,[mail], (err, result2) => {
								if (err){

										 res.status(400).json({
										        errors: [
													{
													  msg: "Invalid credentials",
												},
												  ],
										});
								}else{
							//  let snap = new midtransClient.Snap({
							//	isProduction : false,
							//	serverKey : SERVER_KEY,
							//	clientKey : CLIENT_KEY
							//  });

                             //  result2.map(function(itemtag){
								   //   console.log('bayarrr',itemtag.idpembayaran)
									// if(itemtag.idpembayaran){
								  //   console.log('bayarrr',itemtag.idpembayaran)
								     // snap.transaction.status(itemtag.idpembayaran)
									//	.then((response)=>{
										//	console.log(response)
											res.send(result2)
								    //	});
									  // }else{
										// res.status(400).json({
										//        errors: [
										//			{
										//			  msg: "Invalid credentials",
									//				},
									//			  ],
									//	});
									// }
							       //  })


								}
					     	   });

});


async function getDatamaxidbayar() {
  const connection = await mysql2.createConnection({
     host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal',
    port:3306
  });

  try {
	  		 const [subIdMaxbayar, subFieldIdMaxbayar] = await connection.query('SELECT * FROM logintabel WHERE nohp = ? ', [nohplogin]);
								  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
									   const IDMAX = await Promise.all(subIdMaxbayar.map(async (rowdetil)=>{
										   return {
											   uname : rowdetil.username,
											   hp: rowdetil.noHp,
											   mail:rowdetil.email
										   }
									   }))
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}





//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////ECOMERSE////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/getproduk', (req, res) => {
	//let nomor=req.query.intno;
//	let nocont1 = req.query.nocont;
/*	let sql="SELECT INTERCHANGE.Nomor as nointer,EIRIN.Nomor as Noeir,EIRIN.Remark as remark, "+
	" EIRIN.DateIn AS datein, EIRIN.PrincipleCode As principle,INTERCHANGE.Consignee as consigne, "+
	" INTERCHANGE.TruckingSupplier as trucking, EIRIN.IC as IC, EIRIN.VN AS Vehicle, INTERCHANGE.Exvessel as Exvess, "+
	" INTERCHANGE.ExVoy as exvoy, EIRIN.POD as pod,EIRIN.POI AS poi, EIRIN.ContNo as nocont, containerdetails.Size as size, "+
	" containerdetails.Type as tipe,EIRIN.contCondition as conditionf, containerdetails.DateMnf as mnf, "+
	" containerdetails.MGW AS mgw,containerdetails.NET AS NET,EIRIN.Location as lokasi, containerdetails.Grade as grade, EIRIN.inputby as inputh, "+
	" principlecode.Name as owner "+
	" FROM INTERCHANGE  join EIRIN	on INTERCHANGE.Nomor=EIRIN.intno join containerdetails on containerdetails.contno=EIRIN.contno join principlecode on principlecode.Code=EIRIN.Principlecode where EIRIN.contno=? AND EIRIN.IntNo=? ";*/
	/*const nomor=req.query.intno;
    let sql = 'SELECT * FROM EIRIN where INTNO=?';*/
	/*let dataproduk ={
		id: "12121",
        sku: "",
        name: "",
        price: 0,
        discount: 0,
        offerEnd: "",
        new: false,
        rating: 0,
        saleCount: 0,
		category :[],
		tag :[],
		variation :[],
		image :[],
		shortDescription :'',
		fullDescription :''
	};
	let dataproduk={};

  let newer =true;
  var namtag=[];


    let sqltag="select namatag from tag where idproduk=?"
	 db.query(sqltag,[item.kodeproduk], (err, result2) => {
		if (err) throw err;
		 namtag = results.map(result => result.namatag);
	});

	let sqlnya="select * from produk";
    db.query(sqlnya,(err, result) => {
        if (err) throw err;


							////////// start .map result//////////
						//	result.map( function(item) {

							//console.log(item.harga)
							////////////fetch tagline////////////////////////////
						//	let sqltag="select namatag from tag where idproduk=?"
						//	 db.query(sqltag,[item.kodeproduk], (err, result2) => {
						//		if (err) throw err;
								//  result2.map(function(itemtag){
								//
								//	  namtag.push(itemtag.namatag)
								//  })
								// console.log(namtag);
								// dataproduk.tag=namtag;
								//res.send(result);


						//	});

							///////////////fill data produk///////////////////////////////////
							    //  if(item.new===0){
								//	   newer= false;
								//   }else{
								//	   newer=true;
								 //  }
								//   dataproduk.id=item.ID;
						         /*  dataproduk ={
								     id : item.ID,
									 sku : item.kodeproduk,
									 name:item.nama,
									 price:item.harga,
									 discount:item.diskon,
									 offerEnd:item.offerend,
									 new : newer,
									 rating:item.ratting,

									 saleCount:item.laku,
									 shortDescription:item.deskrippendek,
									 fullDescription:item.deskrippanjang
									}


						//	})  /////////////end .map result//////////////////
       //res.send(dataproduk);
    });
	 console.log('nama tag',namtag)

	 // Function to get the orders for a user
   const getOrdersForUser = function(kode, callback) {
  // Execute the first query to get the user ID
  db.query('SELECT kodeproduk FROM produk WHERE kodeproduk = ?', [kode], function (error, results, fields) {
    if (error) return callback(error);

    // Get the user ID from the first query results
    const userId = results[0].kodeproduk;
   // console.log(results)
    // Execute the second query to get the orders for the user
    db.query('SELECT * FROM tag WHERE idproduk = ?', [userId], function (error, results, fields) {
      if (error) return callback(error);
      callback(null, results);
    });
  });
};

// Call the function to get the orders for a user
getOrdersForUser('asdf123', function(error, orders) {
  if (error) throw error;
 // console.log('Orders for produk:', orders);
});
*/


	 const getProduk = function(callback){
		    db.query('SELECT * FROM produk', function (error, results, fields) {
			  if (error) return callback(error);
			//  namtag = results.map(result => myObj{sku:result.kodeproduk});
			  callback(null, results);
			});
	 }


	 const getTag = function(arrdata,callback){

		  arrdata.map( function(item) {
			//  console.log('id nya',item.id)
		  })
		/* db.query('select namatag from tag where idproduk=?',[idproduk],function(error, results, fields){
			  if (error) return callback(error);

			  callback(null, results);
		 })*/
	 }

	const gettag2 = function(kode, callback) {
		//console.log('tag',kode)
	   // console.log(results)
		// Execute the second query to get the orders for the user
		let namtag=[];
		db.query('SELECT * FROM tag WHERE idproduk = ?', [kode], function (error, results, fields) {
		  if (error) return callback(error);
		   namtag = results.map(result => result.namatag);
		   callback(null, namtag);
		  //callback(null, results);
		});

	};

	getProduk(function(error, produkdata){
		if(error) throw error;
		//	const myObj = {};
		const dataA=[];
		//const userNames = produkdata.map((user) => user.kodeproduk);
       // userNames.forEach((name) => console.log(name));
	   produkdata.map(async function(item) {

			dataA.push({
				    id:item.ID,
		            sku:item.kodeproduk,
		            name:item.nama,
		        	price:item.harga,
		        	discount:item.diskon,
		        	new:item.new,
			        rating:item.ratting,
			        saleCount:item.laku
			})
			const hasil= getEvenNumbers(item.kodeproduk);
         // console.log(hasil);
	   })

		//   getTAG1(dataA, (array) => {
		//console.log(dataA); // [2, 3, 4, 5, 6]
		  // });
		  //  res.send(dataA);
	})

 function  getEvenNumbers(id) {
  //const evenNumbers = [];
var namtag=[];
			let sqltag="select namatag from tag where idproduk=?"
				 db.query(sqltag,[id], (err, result2) => {
								if (err) throw err;
							 namtag = result2.map(result => result.namatag);
								//console.log(namtag)
								  return namtag;
						});


}

    function getTAG1(array, callback) {
	   // console.log(array)
	      array.map( async function(item) {
			 // console.log('id nya',item.sku)
		               let namtag=[];
					   var dataB=[];

	                   let sqltag="select namatag from tag where idproduk=?"
					  await db.query(sqltag,[item.sku], (err, result2) => {
								if (err) throw err;
								 namtag = result2.map(result => result.namatag);
                                // console.log(item.sku)
                              // dataB.push({tag:namtag,id:item.id})
							   let obj1={};
							   obj1.id=item.id;
							   obj1.tag=namtag;
							   dataB.push(obj1)

						});

				//	  console.log(namtag)
		  })


	  callback(array);
	}
//////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
	/*function addOneToArray(array, callback) {
	  for (let i = 0; i < array.length; i++) {
		array[i] += 1;
	  }

	  callback(array);
	}

	function doubleArray(array, callback) {
	  for (let i = 0; i < array.length; i++) {
		array[i] *= 2;
	  }

	  callback(array);
	}

	let myArray = [1, 2, 3, 4, 5];

	addOneToArray(myArray, (array) => {
	  console.log(array); // [2, 3, 4, 5, 6]

	  doubleArray(array, (array) => {
		console.log(array); // [4, 6, 8, 10, 12]
	  });
	});*/



	/////////////////////////////////////////////////////////////////////////////////////////////////////////////

	db.query('SELECT * FROM produk', (error, results, fields) => {
  if (error) throw error;

  const users = results.map(result => {
    return {
      id: result.ID,

    };
  });

 /* const model = {
    total: users.length,
    users: users
  };*/

  //console.log(users);
});
let myArray=[]

function addToMyArray(data) {
  myArray.push(data);
  //console.log(myArray)
}

db.query('SELECT * FROM produk', (error, results, fields) => {
  if (error) throw error;
     let obju={};
	 let arrku=[];
     results.forEach(result => {

	     /*   arrku.push({
			   id:result.ID
		   })

		   	db.query('SELECT namatag FROM tag where idproduk=?',[result.kodeproduk], (error, resultag, fields) => {
			  if (error) throw error;
			  const namtagnya=[];
			   resultag.forEach(resulttg => {
				 namtagnya.push(resulttg.namatag);
			   });

				//console.log(data2);
			   //  console.log(result.ID);
				  //console.log(namtagnya);
			})
       addToMyArray({
			  id:result.ID,
			  name:result.nama

		  })*/
	 })
	// console.log(arrku)
});



/*const data = {
  users: []
};
const data2=[];

db.query('SELECT * FROM produk', (error, results, fields) => {
  if (error) throw error;

  results.forEach(result => {

	db.query('SELECT namatag FROM tag where idproduk=?',[result.kodeproduk], (error, resultag, fields) => {
	  if (error) throw error;
	  const namtagnya=[];
       resultag.forEach(resulttg => {
         namtagnya.push(resulttg.namatag);
	   });
	    data2.push({
			id:result.ID
		})
		console.log(data2);
	   //  console.log(result.ID);
	      //console.log(namtagnya);
	})
//	 console.log(data2);
    data.users.push({
      id: result.ID,
      name: result.kodeproduk,
      email: result.nama
    });
  });

});*/


	function getUsers(id){
 // console.log("Fetching all user data");


  const sql = "SELECT * FROM tag where idproduk=?";
  return new Promise( (resolve,reject) => {
	  let namtag3=[];
    var result = db.query(sql,[id],(err, rows, fields) =>{
      if(err){
        // this will cause promise to "fail"
        reject(err);
      }
    //  console.log("Fetched Users Successfully");
      // this will tell javascript that promise is finished
      // and rows are accesable in then()
	  		 namtag3 = rows.map(result => result.namatag);
      resolve(namtag3);
   })
  })
}

function mainFunction(){
  const result = getUsers()
  .then(rows =>{

  })
  .catch(error => {/** this will be executed if reject(err) happens
   */});

   //  console.log('AAAA',result);
}

 async function asyncMainFunction(){

   const results = await getResults();
   const results2 = await getUsers('asdf123');
   console.log(results);
 /*(async () => {
  try {

   // console.log(results);
  } catch (error) {
    console.error(error);
  } finally {
   // connection.end();
  }
})();*/

}

//asyncMainFunction();




	async function getResults() {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM produk', (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}



async function getData() {
  const connection = await mysql2.createConnection({
     host: 'localhost',
    user: 'root',
    password: '',
    database: 'tes3',
    port:3306
  });

  try {
    //const [rows, fields] = await connection.query('SELECT * FROM produk');
   /* for (const row of rows) {
      console.log(row);
    }*/
 // rows.forEach(result => {
           //    console.log(result.ID)
			        const [rows, fields] = await connection.query('SELECT * FROM PRODUK');
					const results  = await Promise.all(rows.map(async (row) => {

							///////////////////////////////////////////////////////////////////////
							////////////////LEVEL 1 NAMA TAG////////////////////
							let namtag3,namvariasi,kategori,listimage=[];

							////////////////////AMBIL TAGLINE/////////////////////////
						    const [subRows, subFields] = await connection.query('SELECT * FROM tag WHERE idproduk = ?', [row.kodeproduk]);
							namtag3 = subRows.map(result => result.namatag);
							////////////////////AMBIL KATEGORI//////////////////////////////
							const [rowkategori, subFieldkategori] = await connection.query('SELECT * FROM kategori WHERE idproduk = ?', [row.kodeproduk]);
							kategori=rowkategori.map(resultkategori => resultkategori.nama);
                            const [subimage, subFieldsimage] = await connection.query('SELECT concat(image,namafile) as gambar FROM image WHERE idproduk = ?', [row.kodeproduk]);
							listimage= subimage.map(resultlist => resultlist.gambar);
							//console.log(listimage)
							///////////////////////AMBIL BLOK VARIASI////////////////////////////
							const [subRows2, subFields2] = await connection.query('SELECT distinct warna,idproduk FROM variasi WHERE IDproduk = ?', [row.kodeproduk]);
						//	namvariasi=subRows2.map(result3 => result3.warna);
									const resultsvar = await Promise.all(subRows2.map(async (rowvar) => {
										  let ukuran=[];

										  const [subRowsimage, subFieldimage] = await connection.query('SELECT concat(image,namafile) as gambar1 FROM image WHERE IDproduk = ? and warna=? limit 1', [rowvar.idproduk,rowvar.warna]);
									           const imagepath=await Promise.all(subRowsimage.map(async (rowimg)=>{
												   return rowimg.gambar1
											   }))
										  const [subRowsize, subFieldssize] = await connection.query('SELECT * FROM variasi WHERE IDproduk = ? and warna=?', [rowvar.idproduk,rowvar.warna]);
										  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
										       const resultukur = await Promise.all(subRowsize.map(async (rowukur)=>{
												   return {
													   name : rowukur.ukuran,
													   stock: rowukur.stok
												   }
											   }))
										//console.log(ukuran);
												return {
													color : rowvar.warna,
													image : imagepath[0],
													size : resultukur
												}

									}))
						//	console.log(resultsvar)
							//return resultsvar;
							   let sts=null;
							   if(row.new==0){sts=false}else{sts=true}
						    	return {
											id:row.ID,
											sku:row.kodeproduk,
											name:row.nama,
											price:row.harga,
											discount:row.diskon,
											offerEnd :row.offerend,
											new :sts,
											rating: row.ratting,
										    saleCount: row.laku,
											category: kategori,
											tag: namtag3,
											variation : resultsvar,
											image:listimage,
											shortDescription: row.deskrippendek,
											fullDescription:row.deskrippanjang
								};
				     	}));
					  //  const jsonData = {
						//  data: results
					//	};
					//const jsonData = results
                   // console.log(results)
				      res.send(results);
						//console.log(JSON.stringify(jsonData));
	 //    })
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

getData();

});

app.get('/getprodukedit',(req,res)=>{

	  let sql = 'SELECT * FROM produk  where kodeproduk=?';
	     db.query(sql,[email,passwor], (err, result) => {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });

})

app.post('/simpanVariasi',(req,res)=>{
	console.log(req.body.ArrayObjvar)
	   res.send('Post added...');
	 /* let sql = `INSERT INTO test2(nama, alamat, notelp) VALUES ('${form.nama}', '${form.alamat}', '${form.notelp}')`;
    db.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);
        res.send('Post added...');
    });*/
});

app.get('/getkodeproduk', (req, res) => {
	//let nomor=req.query.intno;
//	let nocont1 = req.query.nocont;
	let sqlnya="select max(ID) as ID from produk LIMIT 1";
    db.query(sqlnya,(err, result) => {
        if (err) throw err;
			   res.send(result);
    });
});


app.get('/getdataproduk',(req,res)=>{
	//	console.log(req.query);
	//const nomor=req.query.noInterchange;
	let sqlproduk='SELECT * FROM produk';
	 db.query(sqlproduk,(err, result) => {
        if (err) throw err;
		 let Produk=[];
		  result.map( function(item) {
			//  console.log('id nya',item.id)
			Produk.push({
				       kode : item.kodeproduk,
					   diskon:item.diskon,
					   sts:item.new,
				       nama : item.nama,
					   harga: item.harga,
					   tanggalpost:moment(item.offerend ).format('YYYY-MM-D'),
					   uraian:item.deskrippendek,
					   deskripsi:item.deskrippanjang
			})
		  })
	   res.send(Produk);
    });

	/*async function getDataproduk() {
		 try{
			  const [subRows, subFields] = await db.query('SELECT * FROM produk');
		  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
			   const resultukur = await Promise.all(subRows.map(async (row)=>{
				   return {
					   nama : row.nama,
					   harga: row.harga,
					   tanggalpost:row.offerend,
					   uraian:row.deskrippendek,
					   deskripsi:row.deskrippanjang
				   }
			   }))

			   res.send(resultukur)

	      } catch (err) {
			console.error(err);
		  } finally {
			await db.end();
		  }
	}
	getDataproduk();*/
})


app.put('/editdataproduk', (req, res) => {

	console.log('request edit',req.body)
    // let consignee=req.body.consignenya;
	// let nomor=req.body.nomor;
	// let sql="update produk set consignee=? where nomor=?";
   // db.query(sql,[consignee,nomor], (err, result) => {

      //  if (err) throw err;
       res.send('SUKSESS');
   // });
})

app.post('/tambahproduk',(req,res)=>{
	//console.log(req.body)
	let {	kodeproduk,	nama,harga,diskon,offerend,newsts,uraian,deskripsi  } = req.body
	//let sql="";
	  let sql = `INSERT INTO produk(kodeproduk, nama, harga, diskon, offerend, new, ratting, laku, deskrippendek, deskrippanjang) VALUES ('${kodeproduk}', '${nama}', '${harga}','${diskon}','${offerend}','${newsts}','0','0','${uraian}','${deskripsi}')`;
    db.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);
        res.send('Post added...');
    });
})

app.post('/check_transaction_status', function(req, res){
 // console.log(`- Received check transaction status request:`,req.body);
  core.transaction.status(req.body.transaction_id)
    .then((transactionStatusObject)=>{
      let orderId = transactionStatusObject.order_id;
      let transactionStatus = transactionStatusObject.transaction_status;
      let fraudStatus = transactionStatusObject.fraud_status;

      let summary = `Transaction Result. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}.<br>Raw transaction status:<pre>${JSON.stringify(transactionStatusObject, null, 2)}</pre>`;

      // [5.A] Handle transaction status on your backend
      // Sample transactionStatus handling logic
      if (transactionStatus == 'capture'){
          if (fraudStatus == 'challenge'){
              // TODO set transaction status on your databaase to 'challenge'
          } else if (fraudStatus == 'accept'){
              // TODO set transaction status on your databaase to 'success'
          }
      } else if (transactionStatus == 'settlement'){
        // TODO set transaction status on your databaase to 'success'
        // Note: Non card transaction will become 'settlement' on payment success
        // Credit card will also become 'settlement' D+1, which you can ignore
        // because most of the time 'capture' is enough to be considered as success
      } else if (transactionStatus == 'cancel' ||
        transactionStatus == 'deny' ||
        transactionStatus == 'expire'){
        // TODO set transaction status on your databaase to 'failure'
      } else if (transactionStatus == 'pending'){
        // TODO set transaction status on your databaase to 'pending' / waiting payment
      } else if (transactionStatus == 'refund'){
        // TODO set transaction status on your databaase to 'refund'
      }
      console.log(summary);
      res.send(JSON.stringify(transactionStatusObject, null, 2));
    });
})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////END ECOMERSE////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
///////////KHUSUS UNTUK DKM///////////////////////////////////////////
app.get('/postlogin', (req, res) => {

 // let param = req.query
//console.log(param);
	const email = req.query.email;
	const passwor = req.query.password;
    let sql = 'SELECT Password as pass, Username as userna,Mainmenu as mainme FROM myprogramuser  where username=? and password=?';

     db.query(sql,[email,passwor], (err, result) => {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });
});

app.get('/getakses', (req, res) => {

 // let param = req.query
//console.log(param);
	const email = req.query.email;

    let sql = 'SELECT MAINMENU,AKSESMENU FROM myprogramaksesuser  where username=?';

     db.query(sql,[email], (err, result) => {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });
});

app.get('/getdatainterchange', (req, res) => {
	console.log(req.query);
	const nomor=req.query.noInterchange;
    let sql = 'SELECT * FROM INTERCHANGE where nomor=? LIMIT 100';
    db.query(sql,[nomor], (err, result) => {
        if (err) throw err;
      //  console.log(result);
        res.send(result);
    });

	  //let param = req.query
//console.log(param);
	/*const email = req.query.email;
	const passwor = req.query.password;
    let sql = 'SELECT * FROM user6 where name=? and password=?';

     db.query(sql,[email,passwor], (err, result) => {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });*/
});

app.put('/ubahinterchange', (req, res) => {

	console.log(req.body)
/*let kode = req.body.kode;
	let Newnama = req.body.nama;
	let kelamin = req.body.jeniskelamin;
	let jurusan = req.body.jurusan;
	let telp=req.body.telp;
	let alamat=req.body.alamat;
    let sql = 'update anggota set nama_anggota=?,jk_anggota=?,jurusan_anggota=?,no_telp_anggota=?,alamat_anggota=? WHERE kode_anggota = ?';
	 //console.log(kode+'-'+Newnama+'-'+kelamin+'-'+jurusan);*/
	 let consignee=req.body.consignenya;
	 let nomor=req.body.nomor;
	 let sql="update interchange set consignee=? where nomor=?";
    db.query(sql,[consignee,nomor], (err, result) => {
       // if (err) throw err;
       res.send(result);
    });
});


app.get('/getdataeirin', (req, res) => {
	console.log(req.query);
	const nomor=req.query.intno;
    let sql = 'SELECT * FROM EIRIN where INTNO=?';
    db.query(sql,[nomor], (err, result) => {
        if (err) throw err;
      //  console.log(result);
        res.send(result);
    });
});

/*	noInt :'',
	noEirin :'',
	remark:'',
	dateIn:'',
	principle:'',
	consignee:'',
	trucking:'',
	vehicle:'',
	exvesel:'',
	exvoy:'',
	locatione:'',
	pod:'',
	poc:'',
	contno:'',
	size:'',
	type:'',
	statuse:'',
	dmf:'',
	mgw:'',
	net:'',
	grade:'',
	inputby:''*/

const users = [];
const clientgooglelogin = new OAuth2Client("621705449112-j7drtcdnvclh9lplkho7vfi19d4pkson.apps.googleusercontent.com");
function upsert(array, item) {
  const i = array.findIndex((_item) => _item.email === item.email);
  if (i > -1) array[i] = item;
  else array.push(item);
}



// Main Code Here  //
// Generating JWT


// get config vars
dotenv.config();

// access config var
process.env.TOKEN_SECRET;

app.post('/api/createNewUser', (req, res) => {
	function generateAccessToken(username) {
	  return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
	}
    const token = generateAccessToken({ username: req.body.username });
    res.json(token);


});





/*app.get('/api/userOrders', (req, res) => {
     	function authenticateToken(req, res, next) {
	  const authHeader = req.headers['authorization']
	  const token = authHeader && authHeader.split(' ')[1]

	  if (token == null) return res.sendStatus(401)

	  jwt.verify(token, process.env.TOKEN_SECRET, (err: any, user: any) => {
		console.log(err)

		if (err) return res.sendStatus(403)

		req.user = user

		next()
	  })
    }
	authenticateToken();
})*/
//app.post("/api/users", (req, res) => {
//	console.log(req.body)
 //res.json(users);
//});


// Log in
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(email)
  console.log(password)
  // Look for user email in the database
  let user = users.find((user) => {
    return user.email === email;
  });

console.log('status user',user)
  // If user not found, send error message
  if (!user) {
    return res.status(400).json({
      errors: [
        {
          msg: "Invalid credentials",
        },
      ],
    });
  }
console.log('password 0',password)
console.log('password 1',user.password)
console.log('users password',users.password)
  // Compare hased password with user password to see if they are valid
  let isMatch = await bcrypt.compare(password, user.password);

console.log('match 1',isMatch)
  if (!isMatch) {
	  console.log('tidak valid')
    return res.status(401).json({
      errors: [
        {
          msg: "Email or password is invalid",
        },
      ],
    });
  }

  // Send JWT access token
  const accessToken = await JWT.sign(
    { email },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1m",
    }
  );

  // Refresh token
  const refreshToken = await JWT.sign(
    { email },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "1m",
    }
  );

  // Set refersh token in refreshTokens array
  refreshTokens.push(refreshToken);

  res.json({
    accessToken,
    refreshToken,
  });
});


const users8 = [];
app.post("/api/register", async (req, res) => {
  const user = req.body;
 // console.log('usernya',user)
 /* if (!user.email || !user.password) {
    return res.status(400).send("Username and password are required.");
  }
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  users8.push(user);
  res.json(user);*/

});

/*////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////PROSES LOGIN BY EMAIL DAN NO HP/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////*/
app.post("/loginbyhp",(req,res)=>{
		console.log('status user',req.body)
	const {nohplogin}=req.body
	async function getData() {
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });

		  try {


								 const [subRowDetil, subFieldsDetil] = await connection.query('SELECT * FROM logintabel WHERE nohp = ? ', [nohplogin]);
								  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
									   const resultDetil = await Promise.all(subRowDetil.map(async (rowdetil)=>{
										   return {
											   uname : rowdetil.username,
											   hp: rowdetil.noHp,
											   mail:rowdetil.email
										   }
									   }))

								console.log('data detil',resultDetil)
									 const userName= resultDetil[0].uname;
									 const nohp = resultDetil[0].hp;
									 const email = resultDetil[0].email;
										const accessToken = jwt.sign({userName, nohp, email}, process.env.ACCESS_TOKEN_SECRET,{
											expiresIn: '10m'
										});
										const refreshToken = jwt.sign({userName, nohp, email}, process.env.REFRESH_TOKEN_SECRET,{
											expiresIn: '2m'
										});
									/*	await Users.update({refresh_token: refreshToken},{
											where:{
												id: userId
											}
										});*/

										let sql="update logintabel set refreshtoken=? where nohp=?";
										db.query(sql,[refreshToken,nohp], (err, result) => {

											if (err) throw err;
										  // res.send('SUKSESS');
										});

										res.cookie('refreshToken', refreshToken,{
											httpOnly: true,
											maxAge: 24 * 60 * 60 * 1000
										});
								        res.status(200).json({
												success: [
												  {
													jenis: 'nohp',
												    accessToken:accessToken
												  },
												],
										  });
									//	res.send({ accessToken });
											// res.sendStatus(200);


	      } catch (err) {
			console.error(err);
		  } finally {
			await connection.end();
		  }

	}
	getData();
})

app.post("/loginbyemailotp",(req,res)=>{
		console.log('status user',req.body)
	const {emailuser}=req.body
	async function getData() {
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });

		  try {


								 const [subRowDetil, subFieldsDetil] = await connection.query('SELECT * FROM logintabel WHERE email = ? ', [emailuser]);
								  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
									   const resultDetil = await Promise.all(subRowDetil.map(async (rowdetil)=>{
										   return {
											   uname : rowdetil.username,
											   hp: rowdetil.noHp,
											   mail:rowdetil.email
										   }
									   }))

								console.log('data detil',resultDetil)
									 const userName= resultDetil[0].uname;
									 const nohp = resultDetil[0].hp;
									 const email = resultDetil[0].email;
										const accessToken = jwt.sign({userName, nohp, email}, process.env.ACCESS_TOKEN_SECRET,{
											expiresIn: '10m'
										});
										const refreshToken = jwt.sign({userName, nohp, email}, process.env.REFRESH_TOKEN_SECRET,{
											expiresIn: '2m'
										});
									/*	await Users.update({refresh_token: refreshToken},{
											where:{
												id: userId
											}
										});*/

										let sql="update logintabel set refreshtoken=? where email=?";
										db.query(sql,[refreshToken,emailuser], (err, result) => {

											if (err) throw err;
										  // res.send('SUKSESS');
										});

										res.cookie('refreshToken', refreshToken,{
											httpOnly: true,
											maxAge: 24 * 60 * 60 * 1000
										});
								        res.status(200).json({
												success: [
												  {
													jenis: 'emailverify',
												    accessToken:accessToken
												  },
												],
										  });
									//	res.send({ accessToken });
											// res.sendStatus(200);


	      } catch (err) {
			console.error(err);
		  } finally {
			await connection.end();
		  }

	}
	getData();
})

app.post("/loginuserbyemail",(req,res)=>{
	console.log('status user loginuserbyemail',req.body)
	const {mailuser,pass}=req.body
	prosesToken()
	    async function prosesToken(){
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });
		                 try {
						   const [subpass, subFieldspass] = await connection.query('SELECT password from logintabel where email = ?', [mailuser]);
						   listpass= subpass.map(resultlist => resultlist.password);
						   console.log('pass parameter==',pass)
						      console.log('pass listpass==', listpass[0])
										const match = await bcrypt.compare(req.body.pass, listpass[0]);
										 if(!match){
											console.log('password tidak cocok')

											  res.status(200).json({
													errors: [
													  {
														jenis: 'passnomatch',
														msg: "Password salah"
													  },
													],
											  });
										 }else{
											 console.log('password cocok')
											  const [subRowDetil, subFieldsDetil] = await connection.query('SELECT * FROM logintabel WHERE email = ? ', [mailuser]);
													  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
														   const resultDetil = await Promise.all(subRowDetil.map(async (rowdetil)=>{
															   return {
																   uname : rowdetil.username,
																   hp: rowdetil.noHp,
																   mail:rowdetil.email
															   }
														   }))

														   console.log('data detil',resultDetil)
										 const userName= resultDetil[0].uname;
										 const nohp = resultDetil[0].hp;
										 const email = resultDetil[0].email;
											const accessToken = jwt.sign({userName, nohp, email}, process.env.ACCESS_TOKEN_SECRET,{
												expiresIn: '10m'
											});
											const refreshToken = jwt.sign({userName, nohp, email}, process.env.REFRESH_TOKEN_SECRET,{
												expiresIn: '2m'
											});
										/*	await Users.update({refresh_token: refreshToken},{
												where:{
													id: userId
												}
											});*/

											let sql="update logintabel set refreshtoken=? where email=?";
											db.query(sql,[refreshToken,mailuser], (err, result) => {

												if (err) throw err;
											  // res.send('SUKSESS');
											});

											res.cookie('refreshToken', refreshToken,{
												httpOnly: true,
												maxAge: 24 * 60 * 60 * 1000
											});
											res.status(200).json({
													success: [
													  {
														jenis: 'email',
														accessToken:accessToken
													  },
													],
											  });
										//	res.send({ accessToken });
												// res.sendStatus(200);
										 }


					      } catch (err) {
							console.error(err);
						  } finally {
							await connection.end();
						  }
	}

})

app.post("/loginuser",(req,res)=>{
	console.log('status user loginuser',req.body)
	const {data}=req.body
	async function getData() {
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });

		  try {

			   const usern=data.split('@');
						  //  const originalString = 'H!e@l#l$o %W^o&r*l(d)';
			  // console.log('data body',usern)
			  if(usern.length>1){
					  // const cleaneduname = usern[0].replace(/[!@#$%^&*().]/g, '');
					   const [subRows, subFields] = await connection.query('select email from logintabel where email=?',[data]);
					   listusermail= subRows.map(resuluseremail => resuluseremail.email);
						/*usernamelist = await Promise.all(subRows.map(async (uname)=>{
						   return {
							  emailuser: uname.email
						   }
						}))
						const filteredDatauser = usernamelist.filter(itemuser => itemuser.emailuser.includes(data));*/
						if(listusermail.length !==0){
							  const [subpass, subFieldspass] = await connection.query('SELECT password from logintabel where email = ?', [data]);
						    	listpass= subpass.map(resultlist => resultlist.password);
							console.log('username email ada')
							if(listpass.length!==0){
								   if(listpass[0]===null){
									  console.log('salahhhhhhhhhhhhhhhhhhhhhhhh')
									    res.status(200).json({
													errors: [
													  {
														jenis: 'passnull',
														msg: "Password salah"
													  },
													],
											  });
								  }else{
									       	res.status(200).json({
													success: [
													  {
														jenis: 'emailpassword'

													  },
													],
											  });
								  }
							}
								/*res.status(200).json({
													success: [
													  {
														jenis: "emailexist"
													  },
													],
												  })*/
		                   // prosesToken(data)
						}else{
								console.log('username tidak ada')
								  res.status(200).json({
										errors: [
										  {
                                            jenis: 'userno',
											msg: "Email tidak terdaftar"
										  },
										],
								  });
						}
			  }else{
				        if(!isNaN(+data)){
							console.log('pakai nomor hp')
							 const [subNohp, subFieldsNohp] = await connection.query('SELECT nohp from logintabel where nohp = ?', [data]);
								listNohp= subNohp.map(resulthp => resulthp.nohp);
								if(listNohp.length !==0){
									res.status(200).json({
													success: [
													  {
														telp:listNohp[0],
														jenis: "nohp"
													  },
													],
												  })
								}else{
									res.status(200).json({
											errors: [
											  {
												jenis: 'hpnotfound',
												msg: "Nomor Hp tidak terdaftar"
											  },
											],
									  });
								}
						}else{
							/* const [subUser, subFieldsUser] = await connection.query('SELECT username from logintabel where username = ?', [data]);
								listUser= subUser.map(resultuser => resultuser.username);
							 if(listUser.length !==0){
								 console.log('username ada')
								 prosesToken(data)
							 }else{*/
									console.log('username tidak ada')
									  res.status(200).json({
											errors: [
											  {
												jenis: 'userno',
												msg: "Email tidak terdaftar"
											  },
											],
									  });
							// }
						}
			  }

	      } catch (err) {
			console.error(err);
		  } finally {
			await connection.end();
		  }

	}
	getData();


})

app.get('/api', (req, res) => {
  console.log(req.cookies);

});

app.get('/dataorder',(req,res)=>{
	//console.log('retrieve data order',req.query)
	let {email}=req.query;
		  let sql4 = "SELECT count(*) as jumlah from pembayaran join orderan on orderan.id_order=pembayaran.idorder where pembayaran.status<>'Pending' and  pembayaran.status<>'cancel' and  pembayaran.status<>'success' and pembayaran.id_penyewa= ? ";
								db.query(sql4,[email], (err, resultData) => {
									if (err) throw err;
									//console.log('jumlah order',resultData)
									res.send(resultData)
								});
})

app.get('/datadetailorder',(req,res)=>{
		let {mailuser}=req.query;
		  let sql5 = "SELECT  pembayaran.idpembayaran,lapangan.Nama,orderan.id_order, SUBSTRING(detail_order.jamawal, 1, 5) AS jamawal,SUBSTRING(detail_order.jamakhir, 1, 5) AS jamakhir, FORMAT(pembayaran.jumlahbayar, 2) as jumlahbayar  FROM pembayaran join orderan on orderan.id_order=pembayaran.idorder join detail_order on detail_order.id_order=pembayaran.idorder JOIN lapangan ON lapangan.ID=detail_order.idlapangan where pembayaran.status <> 'cancel' and pembayaran.status <> 'success' and  pembayaran.status <> 'Pending' and pembayaran.id_penyewa=? ";
								db.query(sql5,[mailuser], (err, resultData) => {
									if (err) throw err;
									//console.log('jumlah order',resultData)
									res.send(resultData)
								});
})

app.post('/hapusOrder',(req,res)=>{
	console.log('data yg mau dihapus',req.body)
		let {idordernya,penyewa}=req.body;
		/*  let sql6 = "delete from detail_order where id_order=? ";
								db.query(sql6,[idordernya], (err, resultData) => {
									if (err){ throw err
									console.log('masuk 1',err)
									}else{*/

									  let sql7 = "UPDATE orderan set status='cancel' where id_order=? and id_penyewa=? ";
											db.query(sql7,[idordernya,penyewa], (err2, resultData2) => {
												if (err2){ throw err2
													console.log('masuk 1',err2)
												}else{
												//console.log('jumlah order',resultData)

												     let sqlupdate="update pembayaran set status='cancel' where idorder=? and id_penyewa=?";
													 db.query(sqlupdate,[idordernya,penyewa], (errup, resultup) => {

														if (errup){ throw errup}else{
															   let sql8 = "SELECT  pembayaran.idpembayaran,lapangan.Nama,orderan.id_order, SUBSTRING(detail_order.jamawal, 1, 5) AS jamawal,SUBSTRING(detail_order.jamakhir, 1, 5) AS jamakhir, FORMAT(pembayaran.jumlahbayar, 2) as jumlahbayar  FROM pembayaran join orderan on orderan.id_order=pembayaran.idorder join detail_order on detail_order.id_order=pembayaran.idorder JOIN lapangan ON lapangan.ID=detail_order.idlapangan where pembayaran.status <> 'cancel' and pembayaran.status <> 'Pending' and pembayaran.status <> 'success' and pembayaran.id_penyewa=? ";
																db.query(sql8,[penyewa], (err3, resultafterhapus) => {
																	if (err3) throw err3;
																		console.log('masuk 1',err3)
																	//console.log('jumlah order',resultData)
																	res.send(resultafterhapus)
																});
														}
													  // res.send('SUKSESS');
													});


												}
											});

								/*	}
								});*/
})

app.get("/carinoorder",async(req,res)=>{
	  let sql5 = "SELECT max(no) as nomor from orderan ";
								db.query(sql5,(err, resultData) => {
									if (err) throw err;
									//console.log('jumlah order',resultData)
									noOrder = resultData.map(resultNO => resultNO.nomor);
									res.send(noOrder)
      });
})

app.get("/token",async(req,res)=>{
	//const { refreshToken } = req.cookies['refreshToken']

	//console.log('masuk token')
		async function getData() {
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });

	 try {
     //  const refreshToken1 = req.cookies;
	    const refreshToken = req.cookies.refreshToken;
    	//console.log('refreshToken',refreshToken1);
      if(!refreshToken){
		  console.log(' token tidak ada')
		 // return res.sendStatus(401);
		     res.status(200).json({
					errors: [
					  {
						msg: "Token Undefined",
					  },
					],
			  });
	  }else{
		  console.log(' token  ada')
		/*  const user = await Users.findAll({
            where:{
                refresh_token: refreshToken
            }
          });*/


		   const [subRefreshtoken, subFieldsRefreshtoken] = await connection.query('SELECT * from logintabel where refreshtoken = ?', [refreshToken]);
					listRefreshtoken= subRefreshtoken.map(resulrfToken => resulrfToken.refreshtoken);

		  console.log('listRefreshtoken.....',listRefreshtoken)
		 //  if(!user[0]) return res.sendStatus(403);
		   if(listRefreshtoken.length=0){
			     console.log(' token tidak ditemukan di logintable')
			      res.status(200).json({
					errors: [
					  {
						msg: "User Not found",
					  },
					],
			  });
		   }else{

				    			//	console.log('nilai refreshtoken',refreshToken)
				      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
						//if(err) return res.sendStatus(403);
						if(err){
							res.clearCookie('refreshToken');
						//	console.log('verify failed',err)
							    res.status(200).json({
										errors: [
										  {
											msg: "terjadi kesalahan",
										  },
										],
								  });
						}else{
							//		console.log('verify success')
								/*  const [subRowdata, subFieldsData] =  connection.query('SELECT * FROM logintabel WHERE refreshtoken = ? ', [refreshToken]);
										  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
										       const resultData =  Promise.all(subRowdata.map( (rowdata)=>{
												   return {
													   uname : rowdata.username,
													   hp: rowdata.noHp,
													   mail:rowdata.email
												   }
											   }))
							const username = resultData[0].uname;
							const nohp = resultData[0].hp;
							const email = resultData[0].mail;*/
							  let sql4 = 'SELECT logintabel.username,logintabel.noHp,logintabel.email,penyewa.Alamat,penyewa.Company FROM logintabel join penyewa on penyewa.nama=logintabel.username WHERE refreshtoken = ? ';
								db.query(sql4,[refreshToken], (err, resultData) => {
									if (err) throw err;
									const username = resultData[0].username;
				        	const nohp = resultData[0].noHp;
				        	const email = resultData[0].email;
									const alamat=resultData[0].Alamat;
									const company=resultData[0].Company;
									const accessToken = jwt.sign({username, nohp, email,alamat,company}, process.env.ACCESS_TOKEN_SECRET,{
						         		expiresIn: '2m'
						        	});
							        res.json({ accessToken });
								    //console.log(result);
									//res.send(result);
								});

						}

					})
		   }



	  }



          } catch (err) {
			console.error(err);
		  } finally {
			await connection.end();
 		  }
     }
	 getData();



	/*        try {
        const refreshToken = req.cookies.refreshToken;
        if(!refreshToken) return res.sendStatus(401);
        const user = await Users.findAll({
            where:{
                refresh_token: refreshToken
            }
        });
        if(!user[0]) return res.sendStatus(403);
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if(err) return res.sendStatus(403);
            const userId = user[0].id;
            const name = user[0].name;
            const email = user[0].email;
            const accessToken = jwt.sign({userId, name, email}, process.env.ACCESS_TOKEN_SECRET,{
                expiresIn: '15s'
            });
            res.json({ accessToken });
        });
    } catch (error) {
        console.log(error);
    }*/
})


/*/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////PROSES REGISTER DATA BY EMAIL DAN NOMOR HP/////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////*/


app.put('/registerpass', async(req, res) => {

	//console.log('request edit',req.body)
	const {email,passworr}=req.body
    // let consignee=req.body.consignenya;
	// let nomor=req.body.nomor;
	 const salt = await bcrypt.genSalt(10);
						//console.log("salt:", salt);
						const hashedPassword = await bcrypt.hash(passworr, salt);
						console.log("hashed password:", hashedPassword);
	 let sql="update logintabel set password=? where email=?";
    db.query(sql,[hashedPassword,email], (err, result) => {

	                                 if(err){
										  res.status(200).json({
													errors: [
													  {
										                sts: 'failed',
														msg: "terjadi kesalahan",
													  },
													],
												  });
									 }else{
										 res.status(200).json({
													success: [
													  {
														sts: 'success',
														msg: "Password berhasil di simpan"
													  },
													],
												  });
									 }
      //  if (err) throw err;
         //res.send('success');
    });
})

app.get('/daftaremailotp',(req,res)=>{
		let email=req.query.usermailotp;
		   res.header('Content-Type', 'application/json');
		   let otp=otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false ,lowerCaseAlphabets:false});
			console.log('otppp...',otp)

		    const mailData = {
        from: 'agus.treee@gmail.com',
        to: email,
        subject: 'Kode OTP',
        text: 'tessss',
        html: '<b>Hey there! </b><br> This is our first message sent with Nodemailer<br/>'+otp,
    };

const transporter = nodemailer.createTransport({
    port: 465,
    host: "smtp.gmail.com",
    auth: {
        user: 'agus.treee@gmail.com',
        pass: 'knpaycxmhfzxtepq',
    },
    secure: true, // upgrades later with STARTTLS -- change this based on the PORT
});

    transporter.sendMail(mailData, (error, info) => {
        if (error) {
            return console.log(error);
        }else{


			   res.status(200).send(JSON.stringify({
				success: [
						  {
							  sts:true,
							  kode:otp
						  },
						],
			  }));
       // res.status(200).send({ message: "Mail send", message_id: info.messageId });
		}
    });




})

app.get('/daftarotp',(req,res)=>{
	let nomorhp=req.query.nomorhpx;
	let panjang=nomorhp.length;
	 var nonya = nomorhp.substring(1, panjang);
	  res.header('Content-Type', 'application/json');
   let otp=otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false ,lowerCaseAlphabets:false});
	console.log('otppp...',otp)

	   res.send(JSON.stringify({
		success: [
				  {
					  sts:true,
					  kode:otp
				  },
				],
	  }));
 /* clienttwilio.messages
    .create({
      from: '+14066258919',
      to: '+62'+nonya,
      body: otp
    })
    .then(() => {

      res.send(JSON.stringify({
		success: [
				  {
					  sts:true,
					  kode:otp
				  },
				],
	  }));
    })
    .catch(err => {
      console.log(err);
      res.send(JSON.stringify({ success: false }));
    });*/


	//console.log('nomor HP',res)
	/*clienttwilio.messages.create({
        body: 'haloooo coba tes verivikasi',
        to: '+62'+res,  // Text this number
        from: '+14066258919 '// From a valid Twilio number
    })  .then(() => {
      res.send(JSON.stringify({ success: true }));
    })
    .catch(err => {
      console.log(err);
      res.send(JSON.stringify({ success: false }));
    });*/
})







app.post('/simpankeranjang',async(req,res)=>{
	console.log('data order',req.body)
	let {idpelanggan,lapangan,jamawalorder,jamakhirorder,tglorder}=req.body


Orderlapangan()
		async function Orderlapangan() {
             const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });
			  try {

						 const [generateID,subfieldsId]=await connection.query('SELECT max(no) as nomor from orderan');
						 const Maxidorder=await Promise.all(generateID.map(async(rowmaxid)=>{
							  return rowmaxid.nomor
						 }))

						  const [idbayar,subIdbayar]=await connection.query('SELECT max(no) as nomor from pembayaran');
						 const Maxidbayar=await Promise.all(idbayar.map(async(rowmaxidbayar)=>{
							  return rowmaxidbayar.nomor
						 }))
						// console.log('Max Nomor',Maxidorder)
						let nourut=Number(Maxidorder)+1
						 let idorderr='order'+nourut;
						let sql = `INSERT INTO orderan(id_order,tgl_order,id_penyewa,status) VALUES ('${idorderr}', '${tglorder}', '${idpelanggan}','')`;
						 db.query(sql, (err, result) => {
							if(err){
								res.send(err)
							}else{
								 let jam1=null;
								 let jam2=null;
								 let jamcout1=0;
								 let jamcout2=0;
								 let pecahjm=jamawalorder.split(' ');
								 if(pecahjm[1]==='PM'){
									 let partjam=pecahjm[0].split(':');
									  let bagjam1=0;
									 if(Number(partjam[0])===12){
										 bagjam1=Number(partjam[0]);
									 }else{
										 bagjam1=Number(partjam[0])+12;
									 }
									 jamcout1=bagjam1;
									 jam1=bagjam1+':00:00'
								 }else{
									 let partjmx1=pecahjm[0].split(':')
									 jam1=partjmx1[0]+':00:00';
									 jamcout1=Number(partjmx1[0]);
								 }

								 let pecahjm2=jamakhirorder.split(' ');
								 console.log('waktu jam',pecahjm2[1])
								 if(pecahjm2[1]==='PM'){
									 let partjam2=pecahjm2[0].split(':');
									   let bagjam2=0;
									 if(Number(partjam2[0])===12){
										 bagjam2=Number(partjam2[0]);
									 }else{
										 bagjam2=Number(partjam2[0])+12;
									 }
									 jam2=bagjam2+':00:00'
									 jamcout2=bagjam2;
								 }else{

									   let partjmx2=pecahjm2[0].split(':')
									   if(Number(partjmx2[0])===12){
										   let jumjam=Number(partjmx2[0])+12;
										    jam2=jumjam+':00:00';
											 jamcout2=Number(partjmx2[0])+12;
									   }else{
										   jam2=partjmx2[0]+':00:00';
										    jamcout2=Number(partjmx2[0]);
									   }

								 }

								 console.log('nilai jamnya',jamcout1)
								 	 console.log('nilai jamnya2',jamcout2)


								 let sql2 = `INSERT INTO detail_order(jamawal,jamakhir,idlapangan,id_order) VALUES ('${jam1}', '${jam2}', '${lapangan}','${idorderr}')`;
									 db.query(sql2, async(err2, result2) => {
										 if(err){
											 res.send(err)
										 }else{
											 let nobayar=Number(Maxidbayar)+1;
											 let idpembayaran1='pembayaran'+nobayar;
                                             let vat=(((jamcout2-jamcout1)*125000)*11)/100;
                                             let jumlahbayarx=((jamcout2-jamcout1)*125000)+vat;
											 let sqlbayar = `INSERT INTO pembayaran(idpembayaran,idorder,id_penyewa,status,jumlahbayar,tgl,kodegatepay,expiretime,akunbank,tgltransaksi) VALUES (null, '${idorderr}', '${idpelanggan}','','${jumlahbayarx}',null,null,null,'',null)`;
												 db.query(sqlbayar, async(errbayar, resultbayar) => {
													 if(errbayar){
														 res.send(errbayar)
													 }else{

														  getdatabooking(tglorder)
													 }
												 })


											 // getdatabooking(tglorder)
										 }
									 })
							}
						})
			  }catch (err) {
				console.error(err);
			  } finally {
				await connection.end();
			  }
		}

		 async function getdatabooking(tgl) {
  const connection = await mysql2.createConnection({
     host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal',
    port:3306
  });

  try {
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			//////////////////////////MENCARI LIST LAPANGAN DAN ORDER LAPANGAN////////////////////////////////////////////////
            const [carilap,fieldlap]=await connection.query('SELECT  ID,Nama  FROM lapangan');
            const listlap = await Promise.all(carilap.map(async (rowcarilap) => {


					const [rows,fields]= await connection.query("SELECT distinct detail_order.idlapangan as lapangan  FROM orderan join detail_order on  detail_order.id_order=orderan.id_order where tgl_order=? and status<>'cancel' and detail_order.idlapangan=?",[tgl,rowcarilap.ID]);
					//const [rows, fields] = await connection.query('SELECT distinct idlapangan as lapangan  FROM orderan where tanggal=?',[tgl]);
					const results = await Promise.all(rows.map(async (row) => {
						/*  return {
							   name : rowukur.ukuran,
							   stock: rowukur.stok
						   }*/
						 console.log(row.lapangan)
							   const jamsold=[];


								const [rowsjam, fields] = await connection.query('SELECT jamawal,jamakhir FROM detail_order join orderan on orderan.id_order=detail_order.id_order where orderan.tgl_order=? and detail_order.idlapangan=?',[tgl,row.lapangan]);
								const resultsjam = await Promise.all(rowsjam.map(async (rowjamnya) => {

											  let arrjamA=(rowjamnya.jamawal).split(':');
											   let arrjamB=(rowjamnya.jamakhir).split(':');
												const lim1=Number(arrjamA[0]);
												const lim2=Number(arrjamB[0]);

											   return{
												   jamawala:lim1,
													jamaakhir:lim2

											   }


								}))
								
									//console.log('resultsjam',resultsjam)
											const jamsoldFIX=[];
											const jamreadyFIX=[];
										   const jamawalS=[];
										   const jamakhirS=[];
										/* --asli  resultsjam.map( function(item) {
											   jamawalS.push(item.jamawala)
											   jamakhirS.push(item.jamaakhir)
												for(let i=item.jamawala; i <= item.jamaakhir; i++){
													jamsold.push(i)
												}
									---asli	   })*/
									resultsjam.map( function(item) {
										for(let i=item.jamawala; i <= item.jamaakhir; i++){
													if(i===item.jamaakhir)
													{
														jamreadyFIX.push(i)
												    }else{
													    jamsoldFIX.push(i)
													}
												}
									})
									
									for(let i=1; i<=24; i++){
										if(!jamsoldFIX.includes(i)){
											if(!jamreadyFIX.includes(i)){
												 jamreadyFIX.push(i)
											}
										}
									}
										/*	const jamsoldFIX=[];
											const jamreadyFIX=[];
										   const jamawalS=[];
										   const jamakhirS=[];
										   resultsjam.map( function(item) {
											   jamawalS.push(item.jamawala)
											   jamakhirS.push(item.jamaakhir)
												for(let i=item.jamawala; i <= item.jamaakhir; i++){
													jamsold.push(i)
												}
										   })*/

														//2-3
				//4-6
				//7-8
				//20-23
						  ////////////////////Perhitungan JAM SOLD OUT DAN READY//////////////////////////////////
									/*asli---		for(let i=1; i<=24; i++){
											 if(jamawalS.includes(i) && jamakhirS.includes(i+1)){
													jamsoldFIX.push(i)
											 }else{
												 const filtereJam = jamsold.filter(item => item === i);
												 const itemCount = filtereJam.length;
												 if( itemCount > 1 ){
													 if(jamawalS.includes(i) && jamsold.includes(i+1)){
													 jamsoldFIX.push(i)
													 }
												 }else{
													  if(jamawalS.includes(i) && jamsold.includes(i) && jamakhirS.includes(i+1)){
															jamsoldFIX.push(i)
														}else{
															if(jamsold.includes(i-1) && jamsold.includes(i+1)){
																if(!jamawalS.includes(i) && !jamakhirS.includes(i+1)){
																	   if(jamawalS.includes(i-1) && jamsold.includes(i+1) ){
																		   if(jamakhirS.includes(i) && jamawalS.includes(i+1)){
																				jamreadyFIX.push(i)
																		   }else{
																			   jamsoldFIX.push(i)
																		   }
																	   }else{
																	   jamreadyFIX.push(i)
																	   }
																}else{
																	if(jamakhirS.includes(i) && jamawalS.includes(i+1)){
																		 jamreadyFIX.push(i)
																	}else{
																			jamsoldFIX.push(i)
																	}
																}
															}else{
																if( jamawalS.includes(i) && jamsold.includes(i) && jamsold.includes(i+1) ){
																	jamsoldFIX.push(i)
																}else{
																 jamreadyFIX.push(i)
																}
															}
														}
												 }
											 }
										}---asli*/


						///////////////////////////////////////////////////////////////////////////////////////////////////////////////
					 /////////////////////////////////////////RESEND RESULT DATA KE COMPONENTS////////////////////////////////////////////
								return{
									jamterbooking:jamsoldFIX,
									jamtakterbooking:jamreadyFIX
								}
							//console.log(jamsold)

					}))
					 let datajmterbooking=[];
					 let datajmtakterbooking=[];
					// console.log('tessss',results)
					if(results.length===0){
						datajmterbooking=[];
						datajmtakterbooking=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24];
					}else{
						 results.map( function(itemresult) {
							datajmterbooking=itemresult.jamterbooking;
							datajmtakterbooking=itemresult.jamtakterbooking;
						 })
					}



					            return{
									jamterbooking:datajmterbooking,
									jamtakterbooking:datajmtakterbooking,
									lapangan:rowcarilap.Nama,
									idlap:rowcarilap.ID
								}

			}))

			//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			//////////////////////////MENCARI DATA PEMBAYARAN ////////////////////////////////////////////////////////////////
			     const [databayar,fieldDatabayar]=await connection.query("SELECT  pembayaran.idpembayaran,lapangan.Nama,orderan.id_order, SUBSTRING(detail_order.jamawal, 1, 5) AS jamawal,SUBSTRING(detail_order.jamakhir, 1, 5) AS jamakhir, FORMAT(pembayaran.jumlahbayar, 2) as jumlahbayar  FROM pembayaran join orderan on orderan.id_order=pembayaran.idorder join detail_order on detail_order.id_order=pembayaran.idorder JOIN lapangan ON lapangan.ID=detail_order.idlapangan where pembayaran.status <> 'cancel' and pembayaran.status <> 'Pending' and pembayaran.status <> 'success' and pembayaran.id_penyewa=? ",[idpelanggan]);
            const Detailbayar = await Promise.all(databayar.map(async (rowdetailbayar) => {
				 return rowdetailbayar;
			}))



			////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			///////////////////////////////MENGEMBALIKAN RESULT DATA LAPANGAN//////////////////////////////////////////////

			const [jmlorder,subJmlorder]=await connection.query("SELECT count(*) as jumlah from pembayaran join orderan on orderan.id_order=pembayaran.idorder where pembayaran.status<>'Pending' and  pembayaran.status<>'cancel' and pembayaran.status<>'success' and PEMBAYARAN.id_penyewa= ?",[idpelanggan]);
			const Jumlahorderan=await Promise.all(jmlorder.map(async(rowjmlorder)=>{
			return rowjmlorder.jumlah
			}))





            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            /////////////////////////////////mENGEMBALIKAN REQUEST KE COMPONENT////////////////////////////////////////////////////////
						//console.log(results)
						let databalik={
							datalapangan:listlap,
							datadetil:Detailbayar,
							jumlah:Jumlahorderan
						}
						res.send(databalik);
   } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
 }


})

app.post('/daftardata',async(req,res)=>{
	async function Dataregisterinsert() {
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });

		  try {
				console.log('data req',req.body)
				let {nomorhp,pwd}=req.body;

				/*	const [subRows, subFields] = await connection.query('select noHp from logintabel');
				usernamelist = await Promise.all(subRows.map(async (nohpuser)=>{
				   return {
					  Nohpnya: nohpuser.noHp
				   }
				}))
				const filteredDatauser = usernamelist.filter(itemuser => itemuser.Nohpnya.includes(nomorhp));
				console.log('filteredDatauser',filteredDatauser)*/
				   const [subRows, subFields] = await connection.query('SELECT noHp from logintabel where noHp = ?', [nomorhp]);
					filteredDatauser= subRows.map(resultNohp=> resultNohp.noHp);

				if(filteredDatauser.length !==0){
						res.status(200).json({
							errors: [
							  {
								nomorx: nomorhp,
								sts:'exist',
								msg: "Nomor HP sudah terdaftar",
							  },
							],
						  });
				}else{
					   const salt = await bcrypt.genSalt(10);
						console.log("salt:", salt);
						const hashedPassword = await bcrypt.hash(pwd, salt);
						console.log("hashed password:", hashedPassword);
					 let sql = `INSERT INTO logintabel(username, password, nohp,email) VALUES ('${nomorhp}', '${hashedPassword}', '${nomorhp}',null)`;
					db.query(sql, (err, result) => {
						if(err){
							res.send(err)
						}else{
							// res.send('Post added...');
							 console.log(result);
							  let sql2 = `INSERT INTO penyewa(nohp, nama, alamat, company, email) VALUES ('${nomorhp}', '${nomorhp}', null,null,null)`;
								db.query(sql2, (err, result) => {
										res.status(200).json({
													success: [
													  {

														telp:nomorhp,
														msg: "data berhasil di simpan",
													  },
													],
												  });
								})
						} ;

					});
				}


			  } catch (err) {
			console.error(err);
		  } finally {
			await connection.end();
		  }

	}
	//////////////////////////////////////PEMANGGILAN FUNGSI///////////////////////////////
	Dataregisterinsert()
})


app.post('/simpanalamatuser',(req,res)=>{
    	console.log('parameter alamat',req.body)
		let {alamatuser,emailuser,nama}=req.body;
			 let sql="update penyewa set Alamat=? where email=? or nama=?";
             db.query(sql,[alamatuser,emailuser,nama], (err, result) => {
				 if(err){
					  res.status(200).json({msg: "terjadi kesalahan" });
				 }else{
					 res.status(200).json({alamatuserfix: alamatuser});
				 }
             });
})

app.post('/simpancompanyuser',(req,res)=>{
    	console.log('parameter alamat',req.body)
		let {companyuser,emailuser,nama}=req.body;
			 let sql="update penyewa set Company=? where email=? OR nama=?";
             db.query(sql,[companyuser,emailuser,nama], (err, result) => {
				 if(err){
					  res.status(200).json({msg: "terjadi kesalahan" });
				 }else{
					 res.status(200).json({companyuserfix: companyuser});
				 }
             });
})


app.post('/simpanemail',(req,res)=>{
    //	console.log('parameter alamat',req.body)
		let {emailuser,nama}=req.body;
			 let sql="update penyewa set email=? where nama=?";
             db.query(sql,[emailuser,nama], (err, result) => {
				 if(err){
					  res.status(200).json({msg: "terjadi kesalahan" });
				 }else{
					 res.status(200).json({emailuserfix: emailuser});
				 }
             });
})

app.post('/caridatauser',(req,res)=>{
	let {nama}=req.body;

	 let sql="select * from penyewa where nama=?";
             db.query(sql,[nama], (err, result) => {
				 if(err){
					  res.status(200).json({msg: "terjadi kesalahan" });
				 }else{
					// console.log('tesss',result)
							res.status(200).json(result);
					
			
				 }
             });
})

app.post('/daftardatabyemail',async(req,res)=>{
	//console.log(req.body)
		console.log('data req',req.body)
				let {email,pwd}=req.body;
	//let sql="";
	 const salt = await bcrypt.genSalt(10);
						console.log("salt:", salt);
						const hashedPassword = await bcrypt.hash(pwd, salt);
						console.log("hashed password:", hashedPassword);
	  let sql = `INSERT INTO logintabel(username, password, nohp,email) VALUES ('${email}', '${hashedPassword}', null,'${email}')`;
    db.query(sql, (err, result) => {
       	if(err){
			res.send(err)
		}else{

							  let sql2 = `INSERT INTO penyewa(nohp, nama, alamat, company, email) VALUES (null, '${email}', null,null,'${email}')`;
								db.query(sql2, (err, result) => {

									if(err){
											res.status(200).json({
											errors: [
											  {
												msg: "terjadi kesalahan",
											  },
											],
										  });
									}else{
										res.status(200).json({
													success: [
													  {

														emailnya:email,
														msg: "data berhasil di simpan",
													  },
													],
												  });
									}
								})
		}
    });
})

app.post('/daftardatabyemailverified',async(req,res)=>{
	//console.log(req.body)
		console.log('data req',req.body)

				let {emailuser,uname}=req.body;
	//let sql="";
	// const salt = await bcrypt.genSalt(10);
					//	console.log("salt:", salt);
					//	const hashedPassword = await bcrypt.hash(pwd, salt);
					//	console.log("hashed password:", hashedPassword);
	  let sql = `INSERT INTO logintabel(username, password, nohp,email) VALUES ('${uname}', null, null,'${emailuser}')`;
    db.query(sql, (err, result) => {
       	if(err){
			res.send(err)
		}else{

							  let sql2 = `INSERT INTO penyewa(nohp, nama, alamat, company, email) VALUES (null, '${uname}', null,null,'${emailuser}')`;
								db.query(sql2, (err, result) => {

									if(err){
											res.status(200).json({
											errors: [
											  {
												msg: "terjadi kesalahan",
											  },
											],
										  });
									}else{
										res.status(200).json({
													success: [
													  {
														username: uname,
														emailnya:emailuser,
														msg: "data berhasil di simpan",
													  },
													],
												  });
									}
								})
		}
    });
})





app.post("/daftar", body('datauser').isEmail(),async(req, res)=>{
async function getData() {
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });

		  try {

			   const { datauser } = req.body;
			  console.log('param', req.body)

			  const errorvalid = validationResult(req);



			const [subRows, subFields] = await connection.query('select username from logintabel');
			usernamelist = await Promise.all(subRows.map(async (uname)=>{
			   return {
				  username: uname.username
			   }
			}))


  //  console.log(usernamelist)



	// console.log('aaaaaaaaaaaaa',sqluserlist)


                     if (!errorvalid.isEmpty()) {
						  // return res.status(400).json({ errors: errors.array() });
						  console.log('bukan email')
                           if(!isNaN(+datauser)){
		                const [cekhp, Fieldscekhp] = await connection.query('SELECT noHp from logintabel where Nohp = ?', [datauser]);
		                listhp= cekhp.map(resulhp => resulhp.noHp);
							     	// const filteredDataHP = sqluserlist.filter(itemhp => itemhp.nohp.includes(datauser));
									 if(listhp.length!==0){
											  res.status(200).json({
												errors: [
												  {
													nohp: datauser,
													sts:'exist',
													msg: "Nomor Hp sudah terdaftar",
												  },
												],
											  });
										}else{
											if(datauser.length>10 && datauser.length<15){
											   /////data nomor Hp sudah benar///////////////////
											     res.json({
													exist:[
															{
																jns: 'valid',
																nohp: datauser,
																msg:'Apakan No Hp anda sudah benar?'
															},
														],
													})
											}else{
													res.json({
													exist:[
															{
																jns: 'notvalidnumber',
																msg:'Nomor Telp tidak valid'
															},
														],
													})
											}
										}
						   }else{
							   //////////////////BUKAN NUMBER///////////////////////////////
							   res.json({
									exist:[
										{
											jns: 'bukannumber',
											msg:'Periksa data anda dengan benar'
										},
									],
								})
						   }



					}else{
							const [subuserlist, Fields] = await connection.query('select NoHp,email from penyewa where email =?',[datauser]);
	                        sqluserlist = subuserlist.map(result2 =>result2.email);
					//	const filteredData = sqluserlist.filter(item => item.email.includes(datauser));
					    if (sqluserlist.length!==0){
							  res.status(200).json({
						      errors: [
								  {
									email: datauser ,
									sts:'exist',
									msg: "Email sudah terdaftar",
								  },
								],
							  });
						}else{
								res.json({
									exist:[
										{
											email: datauser ,
											jns:'validmail',
											msg:'noexist'
										},
									],
								})
						}


					}
					//    console.log(usernamelist)
					//	console.log(username)
    // Validate user input
 /*   const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }*/

    // Validate if user already exists
/*const filteredData = sqluserlist.filter(item => item.email.includes(email));
	const filteredDataHP = sqluserlist.filter(itemhp => itemhp.nohp.includes(nomorhp));
		/////////////////CHEK USERNAME//////////////////////////////////////////////////
	//	const filteredDatauser = usernamelist.filter(itemuser => itemuser.username.includes(username));
 //   let user = users.find((user) => {
   //   return user.email === email;
  //  });
  //console.log('email filteredData',aksestoken)
    if (filteredData.length!==0 || filteredDataHP.length!==0 ) {
      // 422 Unprocessable Entity: server understands the content type of the request entity
      // 200 Ok: Gmail, Facebook, Amazon, Twitter are returning 200 for user already exists
	    if(filteredData.length!==0){
				res.status(200).json({
				errors: [
				  {
					email: email,
					sts:'exist',
					msg: "Email sudah terdaftar",
				  },
				],
			  });
		}else if(filteredDataHP.length!==0){
			  res.status(200).json({
				errors: [
				  {
					nohp: nomorhp,
					sts:'exist',
					msg: "Nomor Hp sudah terdaftar",
				  },
				],
			  });
		}else if(filteredDatauser.length!==0){
			  res.status(200).json({
				errors: [
				  {
					username: username,
					msg: "The Username already exists",
				  },
				],
			  });
		}
         }else{


				    	res.json({
							exist:[
								{
									sts:'noexist'
								},
							],
						})




	   }*/
     // Hash password before saving to database
		/*	   const salt = await bcrypt.genSalt(10);
				console.log("salt:", salt);
				const hashedPassword = await bcrypt.hash(password, salt);
				console.log("hashed password:", hashedPassword);*/

				// Save email and password to database/array
			  /*  users.push({
				  email,
				  password: hashedPassword,
				});*/
    // Do not include sensitive information in JWT
 /*   const accessToken = await JWT.sign(
      { email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({
      accessToken,
    });*/



			  } catch (err) {
			console.error(err);
		  } finally {
			await connection.end();
		  }
}


  ///////////////////////////////////PEMANGGILAN FUNGSI/////////////////////////////
  getData();
})

app.post("/daftarORI", body('datauser').isEmail(),async(req, res)=>{
const connection = mysql2.createConnection({
     host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal',
    port:3306
  });
	   const { datauser } = req.body;
	  console.log('param', req.body)

      const errorvalid = validationResult(req);
});

app.post("/daftarbyemail", body('dataemail').isEmail(),async(req, res)=>{
const connection = mysql2.createConnection({
     host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal',
    port:3306
  });
	   const { dataemail } = req.body;
	//  console.log('param', req.body)

      const errorvalid = validationResult(req);
	  //	  console.log('param 2', errorvalid)
	   if (errorvalid.isEmpty()) {
		  // console.log('oke')
		    	let otp=otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false ,lowerCaseAlphabets:false});
		        const mailData = {
					from: 'agus.treee@gmail.com',
					to: dataemail,
					subject: 'Kode OTP',
					text: 'Kode OTP',
					//html: '<b>Hey there! </b><br> This is our first message sent with Nodemailer<br/>',
					html: otp,
				};

				 const transporter = nodemailer.createTransport({
					port: 465,
					host: "smtp.gmail.com",
					auth: {
						user: 'agus.treee@gmail.com',
						pass: 'knpaycxmhfzxtepq',
					},
					secure: true, // upgrades later with STARTTLS -- change this based on the PORT
				});

					transporter.sendMail(mailData, (error, info) => {
						if (error) {
							return console.log(error);
						}
						res.status(200).send({ message: "Mail send", message_id: info.messageId,otpnya:otp,emailx:dataemail });
					});
	   }
});

app.get('/text-mail', (req, res) => {
  //  const {to, subject, text } = req.body;
    const mailData = {
        from: 'agus.treee@gmail.com',
        to: 'irtsuga@gmail.com',
        subject: 'tess email react',
        text: 'tessss',
        html: '<b>Hey there! </b><br> This is our first message sent with Nodemailer<br/>',
    };

const transporter = nodemailer.createTransport({
    port: 465,
    host: "smtp.gmail.com",
    auth: {
        user: 'agus.treee@gmail.com',
        pass: 'knpaycxmhfzxtepq',
    },
    secure: true, // upgrades later with STARTTLS -- change this based on the PORT
});

    transporter.sendMail(mailData, (error, info) => {
        if (error) {
            return console.log(error);
        }
        res.status(200).send({ message: "Mail send", message_id: info.messageId });
    });
});


app.post('/attachments-mail', (req, res) => {
	const transporter = nodemailer.createTransport({
    port: 465,
    host: "smtp.gmail.com",
    auth: {
        user: 'agus.treee@gmail.com',
        pass: 'knpaycxmhfzxtepq',
    },
    secure: true, // upgrades later with STARTTLS -- change this based on the PORT
});
    const {to, subject, text } = req.body;
    const mailData = {
        from: 'youremail@gmail.com',
        to: to,
        subject: subject,
        text: text,
        html: '<b>Hey there! </b><br> This is our first message sent with Nodemailer<br/>',
        attachments: [
            {   // file on disk as an attachment
                filename: 'nodemailer.png',
                path: 'nodemailer.png'
            },
            {   // file on disk as an attachment
                filename: 'text_file.txt',
                path: 'text_file.txt'
            }
        ]
    };

    transporter.sendMail(mailData, (error, info) => {
        if (error) {
            return console.log(error);
        }
        res.status(200).send({ message: "Mail send", message_id: info.messageId });
    });
});

app.get('/generateotp',(req,res)=>{
	let otp=otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false ,lowerCaseAlphabets:false});
	console.log('otppp...',otp)
})

app.get('/send-text', (req, res) => {
    //Welcome Message
    res.send('Hello to the Twilio Server')

    //_GET Variables
    //const { recipient, textmessage } = req.query;


    //Send Text
   /* clienttwilio.messages.create({
        body: textmessage,
        to: recipient,  // Text this number
        from: '+15074734314' // From a valid Twilio number
    }).then((message) => console.log(message.body));*/
	clienttwilio.messages.create({
        body: 'haloooo coba tes verivikasi',
        to: '+6281217401644',  // Text this number
        from: '+14066258919 '// From a valid Twilio number
    }).then((message) => console.log(message.body));
})

app.post("/api/login", async (req, res) => {
  const user = req.body;
  //check if user exists
 /* const foundUser = users8.find((user) => user.email === req.body.email);
  if (!foundUser) {
    return res.status(400).send("Invalid email or password");
  }
  //check if password is correct
  const isPasswordValid = await bcrypt.compare(user.password, foundUser.password);
  if (!isPasswordValid) {
    return res.status(400).send("Invalid email or password");
  }
  //create token
  const token = jwt.sign({ user }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  res.json({ token });*/
});

const verifyUserToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send("Unauthorized request");
  }
  const token = req.headers["authorization"].split(" ")[1];
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(400).send("Invalid token.");
  }
};

app.get("/api/users", verifyUserToken, (req, res) => {
	//console.log('tesss')
  res.json(users8);
});


app.post("/user/generateToken", (req, res) => {
    // Validate User Here
    // Then generate JWT Token
    // let jwtSecretKey = process.env.JWT_SECRET_KEY;
    let jwtSecretKey = 'bbbbbbbbbbbbb';
    let data = {
        time: Date(),
        userId: 12,
    }

    const token = jwt.sign(data, jwtSecretKey);

    res.send(token);
});

// Verification of JWT
app.get("/user/validateToken", (req, res) => {
    // Tokens are generally passed in header of request
    // Due to security reasons.
  //  let tokenHeaderKey = process.env.TOKEN_HEADER_KEY;
   // let jwtSecretKey = process.env.JWT_SECRET_KEY;
    let tokenHeaderKey = 'aaaaaaaaaaaaa';
    let jwtSecretKey = 'bbbbbbbbbbbbb';

    try {
        const token = req.header(tokenHeaderKey);

        const verified = jwt.verify(token, jwtSecretKey);
        if(verified){
            return res.send("Successfully Verified");
        }else{
            // Access Denied
            return res.status(401).send(error);
        }
    } catch (error) {
        // Access Denied
        return res.status(401).send(error);
    }
});

app.get('/daftarbygoogle', async(req,res)=>{
	//  const { token } = req.query;
  let param = req.query
  console.log('tokennya ',req.query)
 /* const ticket = await client.verifyIdToken({
    idToken: token,
    audience: "621705449112-j7drtcdnvclh9lplkho7vfi19d4pkson.apps.googleusercontent.com",
  });
  const { name, email, picture } = ticket.getPayload();
  upsert(users, { name, email, picture });
  res.status(201);
  res.json({ name, email, picture });*/

 /*  axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/json'
                        }
                    }).then((res) => {
					 console.log('email',res.data);

                    }).catch((err) => console.log(err));*/

					var google = require('googleapis').google;
					var OAuth2 = google.auth.OAuth2;
					var oauth2Client = new OAuth2();
					oauth2Client.setCredentials({access_token: param.token});
					var oauth2 = google.oauth2({
					  auth: oauth2Client,
					  version: 'v2'
					});
					oauth2.userinfo.get(
					  function(err, result) {
						if (err) {
						   console.log(err);
						} else {

						  // res.send(result.data)
						 getData(result.data.email,result.data.name,result.data.verified_email,result.data.id)

						}
					});

	async function getData(emailuser,uname,verifikasi,idgoogle) {
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });

		  try {

  console.log('namanyaaaaaaaa',emailuser);

      const [cekhp, Fieldscekhp] = await connection.query('SELECT email from logintabel where email = ?', [emailuser]);
		                listhp= cekhp.map(resulhp => resulhp.email);


						//const filteredData = sqluserlist.filter(item => item.email.includes(datauser));
					    if (listhp.length!==0){
                                  if(verifikasi && idgoogle!==null){
									    res.status(200).json({
											  success: [
												  {
													email: emailuser ,
													verifid:verifikasi,
													username : uname,
													sts:'exist',
													msg: "Email sudah terdaftar",
												  },
												],
											  });
								  }else{

								  }

						}else{
								res.json({
									success:[
										{
											email: emailuser ,
											username : uname,
											verifid:verifikasi,
											sts:'noexist'

										},
									],
								})
						}







			  } catch (err) {
			console.error(err);
		  } finally {
			await connection.end();
		  }
}

})


app.post("/loginbygooglelogin",(req,res)=>{
	  let  {usermail}=req.body;
	  console.log('login gooogle....',req.body)
	  prosesToken()
	 async function prosesToken(){
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });
		                 try {
						    const [submail, subFieldsmail] = await connection.query('SELECT email from logintabel where email = ?', [usermail]);
							listmail= submail.map(resultlist => resultlist.email);
							//	console.log('list password1',req.body.pass)
							//    console.log('list password',listpass)
							if(listmail.length!==0){
									/*const match = await bcrypt.compare(req.body.pass, listpass[0]);
									 if(!match){
										console.log('password tidak cocok')

										  res.status(200).json({
												errors: [
												  {
													jenis: 'passnomatch',
													msg: "Password salah"
												  },
												],
										  });
									 }else{*/
										 console.log('password cocok')
										  const [subRowDetil, subFieldsDetil] = await connection.query('SELECT * FROM logintabel WHERE email = ? ', [usermail]);
												  //ukuran  = subRowsize.map(resultsize => resultsize.ukuran);
													   const resultDetil = await Promise.all(subRowDetil.map(async (rowdetil)=>{
														   return {
															   uname : rowdetil.username,
															   hp: rowdetil.noHp,
															   mail:rowdetil.email
														   }
													   }))

													   console.log('data detil',resultDetil)
									 const userName= resultDetil[0].uname;
									 const nohp = resultDetil[0].hp;
									 const email = resultDetil[0].email;
										const accessToken = jwt.sign({userName, nohp, email}, process.env.ACCESS_TOKEN_SECRET,{
											expiresIn: '10m'
										});
										const refreshToken = jwt.sign({userName, nohp, email}, process.env.REFRESH_TOKEN_SECRET,{
											expiresIn: '2m'
										});
									/*	await Users.update({refresh_token: refreshToken},{
											where:{
												id: userId
											}
										});*/

										let sql="update logintabel set refreshtoken=? where email=?";
										db.query(sql,[refreshToken,usermail], (err, result) => {

											if (err) throw err;
										  // res.send('SUKSESS');
										});

										res.cookie('refreshToken', refreshToken,{
											httpOnly: true,
											maxAge: 24 * 60 * 60 * 1000
										});
								        res.status(200).json({
												success: [
												  {
													jenis: 'email',
													username1:userName,
												    accessToken:accessToken
												  },
												],
										  });
									//	res.send({ accessToken });
											// res.sendStatus(200);
									 //}
							}else{
									  res.status(200).json({
												errors: [
												  {
													jenis: 'noakun',
													msguser: "email tidak terdaftar"
												  },
												],
										  });

							}
					      } catch (err) {
							console.error(err);
						  } finally {
							await connection.end();
						  }
	}

})

app.get('/logout',(req,res)=>{
	 /*   const refreshToken = req.cookies.refreshToken;
    if(!refreshToken) return res.sendStatus(204);

    const user = await Users.findAll({
        where:{
            refresh_token: refreshToken
        }
    });
    if(!user[0]) return res.sendStatus(204);
    const userId = user[0].id;
    await Users.update({refresh_token: null},{
        where:{
            id: userId
        }
    });
    res.clearCookie('refreshToken');
    return res.sendStatus(200);*/


		  prosesLogout()
	 async function prosesLogout(){
		  const connection = await mysql2.createConnection({
			 host: 'localhost',
			user: 'root',
			password: '',
			database: 'futsal',
			port:3306
		  });
		                 try {
							 const refreshToken = req.cookies.refreshToken;
						    const [subLogout, subFieldsLogout] = await connection.query('SELECT username from logintabel where refreshtoken = ?', [refreshToken]);
							listLogout= subLogout.map(resultlist => resultlist.username);
							//	console.log('list password1',req.body.pass)
							//    console.log('list password',listpass)
							if(listLogout.length!==0){



										let sql="update logintabel set refreshtoken=? where username=?";
										db.query(sql,[null,listLogout[0]], (err, result) => {

											if (err) throw err;
										  // res.send('SUKSESS');
										});

										 res.clearCookie('refreshToken');
								        res.status(200).json({
												success: [
												  {
													jenis: 'auth'

												  },
												],
										  });
									//	res.send({ accessToken });
											// res.sendStatus(200);
									 //}
							}else{
									  res.status(200).json({
												errors: [
												  {
													jenis: 'noakun',
													msguser: "Sudah Log Out"
												  },
												],
										  });

							}
					      } catch (err) {
							console.error(err);
						  } finally {
							await connection.end();
						  }
	}
})


app.get('/google-login', async (req, res) => {
//  const { token } = req.query;
  let param = req.query
  console.log('tokennya ',req.query)
 /* const ticket = await client.verifyIdToken({
    idToken: token,
    audience: "621705449112-j7drtcdnvclh9lplkho7vfi19d4pkson.apps.googleusercontent.com",
  });
  const { name, email, picture } = ticket.getPayload();
  upsert(users, { name, email, picture });
  res.status(201);
  res.json({ name, email, picture });*/

 /*  axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/json'
                        }
                    }).then((res) => {
					 console.log('email',res.data);

                    }).catch((err) => console.log(err));*/

					var google = require('googleapis').google;
					var OAuth2 = google.auth.OAuth2;
					var oauth2Client = new OAuth2();
					oauth2Client.setCredentials({access_token: param.token});
					var oauth2 = google.oauth2({
					  auth: oauth2Client,
					  version: 'v2'
					});
					oauth2.userinfo.get(
					  function(err, result) {
						if (err) {
						   console.log(err);
						} else {
						   console.log(result.data);
						   res.send(result.data)
						}
					});
});

app.get('/getbookinglapangan', (req, res) => {
	let tgl=req.query.tanggal;
	//console.log(tgl)



 /* const sql = 'SELECT distinct idlapangan as lapangan  FROM order1 where tanggal=?';
  db.query(sql,[tgl], (err, resultlap) => {
    if (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    } else {
		    const jambookingan=[];
	        resultlap.map( function(itemlap) {
				  const idlapng=itemlap.lapangan;
				  const sql2 = 'SELECT jamawal,jamakhir FROM orderan where idlapangan=? ';
                  db.query(sql2,[idlapng], (err2, result2) => {
						const jamsold=[];
						const jamsoldFIX=[];
						const jamreadyFIX=[];
						const jamawalS=[];
						const jamakhirS=[];

						   result2.map( function(item) {
			                   let arrjamA=(item.jamawal).split(':');
					 		   let arrjamB=(item.jamakhir).split(':');
						        const lim1=Number(arrjamA[0]);
							    const lim2=Number(arrjamB[0]);
								for(let i=lim1; i <= lim2; i++){
									jamsold.push(i)
								}
								//let tempbts=lim2;
								jamawalS.push(lim1);
				               jamakhirS.push(lim2);

	                 	   })
//2-3
//4-6
//7-8
//20-23
		  ////////////////////Perhitungan JAM SOLD OUT DAN READY//////////////////////////////////
		                        for(let i=1; i<=24; i++){
								     if(jamawalS.includes(i) && jamakhirS.includes(i+1)){
											jamsoldFIX.push(i)
									 }else{
										 const filtereJam = jamsold.filter(item => item === i);
										 const itemCount = filtereJam.length;
										 if( itemCount > 1 ){
											 if(jamawalS.includes(i) && jamsold.includes(i+1)){
											 jamsoldFIX.push(i)
											 }
										 }else{
											  if(jamawalS.includes(i) && jamsold.includes(i) && jamakhirS.includes(i+1)){
													jamsoldFIX.push(i)
												}else{
												    if(jamsold.includes(i-1) && jamsold.includes(i+1)){
														if(!jamawalS.includes(i) && !jamakhirS.includes(i+1)){
															   if(jamawalS.includes(i-1) && jamsold.includes(i+1) ){
																   if(jamakhirS.includes(i) && jamawalS.includes(i+1)){
																	    jamreadyFIX.push(i)
																   }else{
																	   jamsoldFIX.push(i)
																   }
															   }else{
															   jamreadyFIX.push(i)
															   }
														}else{
															if(jamakhirS.includes(i) && jamawalS.includes(i+1)){
																 jamreadyFIX.push(i)
															}else{
																	jamsoldFIX.push(i)
															}
														}
													}else{
														if( jamawalS.includes(i) && jamsold.includes(i) && jamsold.includes(i+1) ){
															jamsoldFIX.push(i)
														}else{
														 jamreadyFIX.push(i)
														}
													}
												}
										 }
									 }
								}

					 jambookingan.push({idlapangan:itemlap.lapangan})

                  })
                 //  console.log(jamreadyFIX)

			})

    }
  });*/

 async function getdatabooking() {
  const connection = await mysql2.createConnection({
     host: 'localhost',
    user: 'root',
    password: '',
    database: 'futsal',
    port:3306
  });

  try {

            const [carilap,fieldlap]=await connection.query('SELECT  ID,Nama  FROM lapangan');
            const listlap = await Promise.all(carilap.map(async (rowcarilap) => {

				// console.log('tanggal data',tgl);
				 //	 console.log('Lapangan',rowcarilap.ID);
					const [rows,fields]= await connection.query("SELECT distinct detail_order.idlapangan as lapangan  FROM orderan join detail_order on  detail_order.id_order=orderan.id_order where orderan.tgl_order=? and orderan.status <> 'cancel' and detail_order.idlapangan=?",[tgl,rowcarilap.ID]);
					//const [rows, fields] = await connection.query('SELECT distinct idlapangan as lapangan  FROM orderan where tanggal=?',[tgl]);
					const results = await Promise.all(rows.map(async (row) => {
						/*  return {
							   name : rowukur.ukuran,
							   stock: rowukur.stok
						   }*/
					//	 console.log(row.lapangan)
							   const jamsold=[];


								const [rowsjam, fields] = await connection.query('SELECT jamawal,jamakhir FROM detail_order join orderan on orderan.id_order=detail_order.id_order where orderan.tgl_order=? and detail_order.idlapangan=?',[tgl,row.lapangan]);
								const resultsjam = await Promise.all(rowsjam.map(async (rowjamnya) => {

											    let arrjamA=(rowjamnya.jamawal).split(':');
											    let arrjamB=(rowjamnya.jamakhir).split(':');
												const lim1=Number(arrjamA[0]);
												const lim2=Number(arrjamB[0]);

											   return{
												   jamawala:lim1,
													jamaakhir:lim2

											   }


								}))
								
								//console.log('resultsjam',resultsjam)
											const jamsoldFIX=[];
											const jamreadyFIX=[];
										   const jamawalS=[];
										   const jamakhirS=[];
										/* --asli  resultsjam.map( function(item) {
											   jamawalS.push(item.jamawala)
											   jamakhirS.push(item.jamaakhir)
												for(let i=item.jamawala; i <= item.jamaakhir; i++){
													jamsold.push(i)
												}
									---asli	   })*/
									resultsjam.map( function(item) {
										for(let i=item.jamawala; i <= item.jamaakhir; i++){
													if(i===item.jamaakhir)
													{
														jamreadyFIX.push(i)
												    }else{
													    jamsoldFIX.push(i)
													}
												}
									})
									
									for(let i=1; i<=24; i++){
										if(!jamsoldFIX.includes(i)){
											if(!jamreadyFIX.includes(i)){
												 jamreadyFIX.push(i)
											}
										}
									}
									

														//2-3
				//4-6
				//7-8
				//20-23
			//	console.log('jamsoldFIX---',jamsoldFIX)
			//	console.log('jamreadyFIX---',jamreadyFIX)
				
						  ////////////////////Perhitungan JAM SOLD OUT DAN READY//////////////////////////////////
										/* --asli	for(let i=1; i<=24; i++){
										if(jamsold.includes(i)){
											 if(i===jamakhirS){
												
											 }else{
												// console.log('jamakhirS --',jamakhirS) 
												 jamsoldFIX.push(i)
											 }
											 
										  }else{
												 if(jamawalS.includes(i) && jamakhirS.includes(i+1)){
														jamsoldFIX.push(i)
												 }else{
													 const filtereJam = jamsold.filter(item => item === i);
													 const itemCount = filtereJam.length;
													// console.log('itemcount ',filtereJam)
													 if( itemCount > 1 ){
														 if(jamawalS.includes(i) && jamsold.includes(i+1)){
														 jamsoldFIX.push(i)
														 }
													 }else{
														  if(jamawalS.includes(i) && jamsold.includes(i) && jamakhirS.includes(i+1)){
																jamsoldFIX.push(i)
															}else{
																if(jamsold.includes(i-1) && jamsold.includes(i+1)){
																	if(!jamawalS.includes(i) && !jamakhirS.includes(i+1)){
																		   if(jamawalS.includes(i-1) && jamsold.includes(i+1) ){
																			   if(jamakhirS.includes(i) && jamawalS.includes(i+1)){
																					jamreadyFIX.push(i)
																			   }else{
																				   jamsoldFIX.push(i)
																			   }
																		   }else{
																		   jamreadyFIX.push(i)
																		   }
																	}else{
																		if(jamakhirS.includes(i) && jamawalS.includes(i+1)){
																			 jamreadyFIX.push(i)
																		}else{
																				jamsoldFIX.push(i)
																		}
																	}
																}else{
																	if( jamawalS.includes(i) && jamsold.includes(i) && jamsold.includes(i+1) ){
																		jamsoldFIX.push(i)
																	}else{
																	 jamreadyFIX.push(i)
																	}
																}
															}
													 }
												 }
											}
										}  --asli */
			///////////////////////////////////////////////////////////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////CARI NAMA LAPANGAN/////////////////////////////////////////////////////////
						const [rowslap, fieldslap] = await connection.query('SELECT nama FROM lapangan where ID=?',[row.lapangan]);
						const resultslap = await Promise.all(rowslap.map(async (rowlapnyanya) => {
											   return rowlapnyanya.nama
								}))

						///////////////////////////////////////////////////////////////////////////////////////////////////////////////
					 /////////////////////////////////////////RESEND RESULT DATA KE COMPONENTS////////////////////////////////////////////
								return{
									jamterbooking:jamsoldFIX,
									jamtakterbooking:jamreadyFIX
								}
							//console.log(jamsold)

					}))
					 let datajmterbooking=[];
					 let datajmtakterbooking=[];
					// console.log('tessss',results)
					if(results.length===0){
						datajmterbooking=[];
						datajmtakterbooking=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24];
					}else{
						 results.map( function(itemresult) {
							datajmterbooking=itemresult.jamterbooking;
							datajmtakterbooking=itemresult.jamtakterbooking;
						 })
					}

					////////////////////////////////////////////////////////////////////////////////////////////////////////////////
					///////////////////////////////MENGEMBALIKAN RESULT DATA LAPANGAN//////////////////////////////////////////////

					            return{
									jamterbooking:datajmterbooking,
									jamtakterbooking:datajmtakterbooking,
									lapangan:rowcarilap.Nama,
									idlap:rowcarilap.ID
								}

			}))


						//console.log('ceklapangan',listlap)
						//if(results.length===0){
						//	console.log('hasil cek data 0',results)
						//}else{
							//console.log('hasil cek data ada',results)
						//}
				     	res.send(listlap);
   } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
 }


 /////////PEMANGGILAN FUNGSI///////////////////
  getdatabooking();

});



app.get('/getbookingjam',(req,res)=>{
	let tgl = moment(req.query.tanggal).format('YYYY-MM-D');
	let idlapang=req.query.idlap;
	//console.log('tanggalnya ',req.query.tanggal)
	//console.log('idnya ',req.query.idlap)

	  let sql = 'SELECT jamawal,jamakhir FROM orderan where tanggal=? and idlapangan=?';
    db.query(sql,[tgl,idlapang], (err, result) => {
        if (err) throw err;
       console.log(result);
        res.send(result);
    });
})

app.post('/postjam',(req,res)=>{
	let tgl = moment(req.query.tanggal).format('YYYY-MM-D');
	let idlapang=req.query.idlap;
	//console.log('tanggalnya ',req.query.tanggal)
	//console.log('idnya ',req.query.idlap)

	/*  let sql = 'SELECT jamawal,jamakhir FROM orderan where tanggal=? and idlapangan=?';
    db.query(sql,[tgl,idlapang], (err, result) => {
        if (err) throw err;
       console.log(result);
        res.send(result);
    });*/
})

app.get('/tesdelphi',(req,res)=>{
	//let tgl = moment(req.query.tanggal).format('YYYY-MM-D');
	//let idlapang=req.query.idlap;
	//console.log('tanggalnya ',req.query.tanggal)
	//console.log('idnya ',req.query.idlap)

	/*  let sql = 'SELECT jamawal,jamakhir FROM orderan where tanggal=? and idlapangan=?';
    db.query(sql,[tgl,idlapang], (err, result) => {
        if (err) throw err;
       console.log(result);
        res.send(result);
    });*/
	res.send('oke')
})

app.get('/geteirjoin', (req, res) => {
//	console.log(req.query);
let nomor=req.query.intno;
	let nocont1 = req.query.nocont;
	let sql="SELECT INTERCHANGE.Nomor as nointer,EIRIN.Nomor as Noeir,EIRIN.Remark as remark, "+
	" EIRIN.DateIn AS datein, EIRIN.PrincipleCode As principle,INTERCHANGE.Consignee as consigne, "+
	" INTERCHANGE.TruckingSupplier as trucking, EIRIN.IC as IC, EIRIN.VN AS Vehicle, INTERCHANGE.Exvessel as Exvess, "+
	" INTERCHANGE.ExVoy as exvoy, EIRIN.POD as pod,EIRIN.POI AS poi, EIRIN.ContNo as nocont, containerdetails.Size as size, "+
	" containerdetails.Type as tipe,EIRIN.contCondition as conditionf, containerdetails.DateMnf as mnf, "+
	" containerdetails.MGW AS mgw,containerdetails.NET AS NET,EIRIN.Location as lokasi, containerdetails.Grade as grade, EIRIN.inputby as inputh, "+
	" principlecode.Name as owner "+
	" FROM INTERCHANGE  join EIRIN	on INTERCHANGE.Nomor=EIRIN.intno join containerdetails on containerdetails.contno=EIRIN.contno join principlecode on principlecode.Code=EIRIN.Principlecode where EIRIN.contno=? AND EIRIN.IntNo=? ";
	/*const nomor=req.query.intno;
    let sql = 'SELECT * FROM EIRIN where INTNO=?';*/
    db.query(sql,[nocont1,nomor], (err, result) => {
        if (err) throw err;
      //  console.log(result);
        res.send(result);
    });


});



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////TES REDUX SAGA/////////////////////////////////////////////////////////////////
app.get('/getdatauser',(req,res)=>{
//	let tgl = moment(req.query.tanggal).format('YYYY-MM-D');
	//let idlapang=req.query.idlap;
	//console.log('tanggalnya ',req.query.tanggal)
	//console.log('idnya ',req.query.idlap)

	  let sql = 'SELECT * FROM usersaga';
    db.query(sql, (err, result) => {
        if (err) throw err;
      // console.log(result);
        res.send(result);
    });
})


app.post('/tambahdatasiswa',(req,res)=>{
      //console.log('data', req.body)
	  const {namax}=req.body;
 let sql = `INSERT INTO usersaga(NAMA) VALUES ('${namax}')`;
    db.query(sql, (err, result) => {
       	if(err){
			console.log('erro',err)
			//res.send(err)
		}else{
				let sql2 = 'SELECT * FROM usersaga';
				db.query(sql2, (err2, result2) => {
					if (err2) throw err2;
				  // console.log(result);
					res.send(result2);
				});
		}
	})


})

app.delete('/hapusdatasiswa',(req,res)=>{
   console.log('data delete', req.query)
   let {idsiswa}=req.query;
	let sql = 'DELETE FROM usersaga where ID=?'
    db.query(sql,[idsiswa], (err, result) => {
       	if(err){
			console.log('erro',err)
			//res.send(err)
		}else{
				res.send(result);
		}
	})
})

app.put('/editdatasiswa',(req,res)=>{
   console.log('data edit', req.body)

})



////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////KHUSUS VUE JS////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
/*app.get('/api/tutorials',(req,res)=>{
	let sql="select * from tutorials";
	   db.query(sql, (err, result) => {
        if (err) throw err;
      //  console.log(result);
        res.send(result);
    });
})*/

app.get('/api/tutorials',(req,res)=>{
	let sql="select DISTINCT intno as Nomor from  containerstock  ";
	   db.query(sql, (err, result) => {
        if (err) throw err;
      //  console.log(result);
        res.send(result);
    });
})

app.post('/api/tutorials',(req,res)=>{
		let {title,description} = req.body
	//console.log('panggil tambahdata sukses',req.body)
	let datecreate=new Date();

let date2=datecreate.toISOString().replace(/T/, " ").replace(/\..+/,'');
	//console.log(date2)
	 let sql = `INSERT INTO tutorials(title,description,published,createdAt,updatedAt) VALUES ('${title}','${description}','0','${date2}',null)`;
    db.query(sql, (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			  // db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			  //  console.log(result);
					 res.send(result);
			//	});
	    }
	})
})

////////////BY PARAMS/////////////////////////
app.get('/api/cari',(req,res)=>{
	let {title} = req.query
//	console.log('param',req.query)

	 let sql = 'select DISTINCT interchange.nomor as Nomor from interchange join containerstock on interchange.nomor=containerstock.intno WHERE containerstock.intno like ?';
    db.query(sql,['%' + title  + '%'] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			 //   console.log(result);
				 res.send(result);
			//	});
	    }
	})
})

app.get('/api/caripayment',(req,res)=>{
	let {nomorbl} = req.query
	//console.log('param',req.query)

	 let sql = 'select * from interchangedocpay where intno=?';
    db.query(sql,[nomorbl] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			  //  console.log(result);
				 res.send(result);
			//	});
	    }
	})
})

app.get('/api/cariDikumenin',(req,res)=>{
	let {intnumber} = req.query
	//console.log('param',req.query)

	 let sql = 'select * from interchange  where nomor=?';
    db.query(sql,[intnumber] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			  //  console.log(result);
				 res.send(result);
			//	});
	    }
	})
})


app.get('/api/caricontainer',(req,res)=>{
	let {nomorbl} = req.query
	//console.log('param',req.query)

	 let sql = 'select * from containerstock where intno=?';
    db.query(sql,[nomorbl] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			  //  console.log(result);
				 res.send(result);
			//	});
	    }
	})
})



app.get('/api/carieircontainer',(req,res)=>{
	let {nocont,eirnox} = req.query
	//console.log('param EIR',req.query)

	 let sql = 'select * from eirin where contno=? and nomor=?';
    db.query(sql,[nocont,eirnox] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			  //  console.log(result);
				 res.send(result);
			//	});
	    }
	})
})

app.get('/api/carisurveydata',(req,res)=>{
	let {nocont,surveyno} = req.query
	//console.log('param',req.query)

	 let sql = 'select * from surveycontainer where contno=? and nomor=?';
    db.query(sql,[nocont,surveyno] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			  //  console.log(result);
				 res.send(result);
			//	});
	    }
	})
})


app.get('/api/carieorcontainer',(req,res)=>{
	let {nomorsvy} = req.query
	//console.log('param',req.query)

	 let sql = 'select * from surveycontainer where contno=? and nomor=?';
    db.query(sql,[nomorsvy] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			  //  console.log(result);
				 res.send(result);
			//	});
	    }
	})
})


app.get('/api/cariInterchangecontainer',(req,res)=>{
	let {nomorpay} = req.query
	console.log('param',req.query)

	 let sql = 'select interchangedocpaycontainer.ContNo,interchangedocpaycontainer.CleaningType,eirout.DateOut from interchangedocpaycontainer join eirout on eirout.contno=interchangedocpaycontainer.contno where interchangedocpaycontainer.nomor=?';
    db.query(sql,[nomorpay] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			   console.log(result);
				 res.send(result);
			//	});
	    }
	})
})



app.get('/api/caridetailINpayment',(req,res)=>{
	let {nomorpay} = req.query
	//console.log('param PAYMENT',req.query)

	let sql = 'select .interchangedocpay.Nomor, interchangedocpay.Consignee as Consignee, interchangedocpay.Emkl,interchangedocpay.PARTY,interchangedocpay.InputDate,interchangedocpaydetails.DocumentFeeIDR,interchangedocpaydetails.LiftOffIDR,interchangedocpaydetails.CleaningIDR from interchangedocpay join interchangedocpaydetails on interchangedocpaydetails.nomor=interchangedocpay.nomor where interchangedocpay.nomor=?';
    db.query(sql,[nomorpay] , (err, result) => {
       	if(err){
			res.send(err)
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			  //  console.log(result);
				 res.send(result);
			//	});
	    }
	})
})

app.get('/api/contdetails',(req,res)=>{
	let {nocontiner} = req.query
//	console.log('param',req.query)
	//ContNo, Size, Type, Payload, Payload1, Payload2, Payload3, MGW, NET, CSC, MnfMonth, MnfYear, DateMnf, Grade, Material, Inputby
	 let sql = 'select surveycontainer.ContNo,containerdetails.Size,containerdetails.Type,containerdetails.Payload,containerdetails.MGW,containerdetails.NET, '+
	  ' containerdetails.CSC,containerdetails.MnfMonth,containerdetails.MnfYear,containerdetails.DateMnf,containerdetails.Grade,containerdetails.Material '+
	 ' from surveycontainer '+
	 'join containerdetails on containerdetails.contno=surveycontainer.contno where surveycontainer.contno=?';
    db.query(sql,[nocontiner] , (err, result) => {
       	if(err){
			res.send(err)
			// console.log(err);
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			//   console.log(result);
				 res.send(result);
			//	});
	    }
	})
})



app.get('/api/getdatasurveydetails',(req,res)=>{
	let {nomorsvy} = req.query
//	console.log('param',req.query)
	//Nomor, POC, TOD, AR, Dlength, DWidth, DSatuan, DQuantity, DSize, Account
	 let sql = 'select surveycontainerdetails.POC,surveycontainerdetails.TOD,surveycontainerdetails.AR,surveycontainerdetails.Dlength,'+
	 ' surveycontainerdetails.DWidth,surveycontainerdetails.DSatuan,surveycontainerdetails.DQuantity,surveycontainerdetails.DSize, '+
	 ' surveycontainerdetails.Account '+
	 ' from surveycontainerdetails join surveycontainer on surveycontainer.nomor=surveycontainerdetails.nomor '+
	 'join containerdetails on containerdetails.contno=surveycontainer.contno where surveycontainerdetails.nomor=?';
    db.query(sql,[nomorsvy] , (err, result) => {
       	if(err){
			res.send(err)
			//console.log(err);
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			//   console.log(result);
				 res.send(result);
			//	});
	    }
	})
})


app.get('/api/getdataeordetil',(req,res)=>{
	let {noeor} = req.query
//	console.log('param',req.query)
	//Nomor, POC, TOD, AR, Dlength, DWidth, DSatuan, DQuantity, DSize, Account
	 let sql = 'select * from eorcontainer join eorcontainerdetails on eorcontainerdetails.nomor=eorcontainer.nomor where eorcontainer.nomor=?';
    db.query(sql,[noeor] , (err, result) => {
       	if(err){
			res.send(err)
			//console.log(err);
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			//   console.log(result);
				 res.send(result);
			//	});
	    }
	})
})


app.get('/api/getdataeor',(req,res)=>{
	let {noeor} = req.query
//	console.log('param',req.query)
	//Nomor, POC, TOD, AR, Dlength, DWidth, DSatuan, DQuantity, DSize, Account
	 let sql = 'select * from eorcontainer where nomor=?';
    db.query(sql,[noeor] , (err, result) => {
       	if(err){
			res.send(err)
			//console.log(err);
		}else{
			// let sql2="select * from tabeluser";
			//   db.query(sql2, (err2, result2) => {
			//	if (err2) throw err2;
			//   console.log(result);
				 res.send(result);
			//	});
	    }
	})
})
