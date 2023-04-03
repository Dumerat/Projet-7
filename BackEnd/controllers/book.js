const Book = require('../models/Book');
const fs = require('fs');

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book)
  delete bookObject._id
  delete bookObject._userId
  const book = new Book({
      ...bookObject,  //méthode spread pour récupérer les data du Book sauf ceux enlevées précédement
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });
  book.save()
  .then(() => {res.status(201).json({message: 'Livre enregistré avec succès!'})})
  .catch((error) => {res.status(400).json({ error: error })});
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {res.status(200).json(book)})
    .catch((error) => {res.status(404).json({ error: error })})
};
  
exports.modifyBook = (req, res, next) => {
  const bookObject = req.file
  ? {  //si une nouvelle image est donné l'objet bookObject contiendra son url
      ...JSON.parse(req.body.book),
      imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
    }
  : { ...req.body };
  delete bookObject._userId; //par sécurité on utilise l'id de notre jwt est pas celui fourni de base

  Book.findOne({ _id: req.params.id }) //trouve le bon livre
    .then((book) => {
      if (book.userId != req.auth.userId) { //vérifie l'utilisateur
        res.status(401).json({ message: "Non autorisé" });
      } else {
        let oldImage = book.imageUrl.split('/images/')[1];
        if (oldImage && req.file && book.imageUrl) {
          fs.unlink(`images/${oldImage}`, (error) => { //si l'image est remplacer supprime l'ancienne 
            if (error) {
              return res.status(500).json({ message: "Erreur survenue lors de la suppression de l'image." });
            }
          })
        }
        Book.updateOne(
          { _id: req.params.id }, //le livre a mettre à jour
          { ...bookObject, _id: req.params.id } //nouvelle valeur du livre
        )
        .then(() => res.status(200).json({ message: "Livre modifié!" }))
        .catch((error) => res.status(401).json({ error }))
      }
    })
    .catch((error) => {res.status(400).json({ error })
  });
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id})
    .then(book => {
      if (book.userId != req.auth.userId) {
        res.status(401).json({message: 'Not authorized'});
      } else {
        const filename = book.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => { //supprime l'image du fichier images
          Book.deleteOne({_id: req.params.id})
            .then(() => { res.status(200).json({message: 'Livre supprimé !'})})
            .catch(error => res.status(401).json({ error }));
        });
      }
    })
    .catch( error => {
        res.status(500).json({ error });
  });
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => {res.status(200).json(books)})
    .catch((error) => {res.status(400).json({ error: error })})
};

exports.getBestBooks = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 }) //Prend les meilleurs notes
    .limit(3)
    .then((book) => res.status(200).json(book))
    .catch((error) => res.status(400).json({ error }))
};

exports.newRateBook = (req, res) => {
  const userId = req.auth.userId;
  
  Book.findById(req.params.id)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé" });
      }
      
      const existingRating = book.ratings.find((rating) => rating.userId === userId) //vérifie si l'utilisateur a déjà mis une note
      
      if (existingRating) { 
        return res.status(401).json({ message: "Impossible de noter ce livre une seconde fois." })
      }
       
      book.ratings = [...book.ratings, { userId, grade: req.body.rating }] //ajoute la note 
      book.averageRating = (book.ratings.reduce((total, rating) => total + rating.grade, 0) / book.ratings.length).toFixed(1) //créer la moyenne des note //arrondir la valeur

      return book.save();
    })
    .then((updatedBook) => {res.status(200).json(updatedBook)})
    .catch((error) => {
      console.log(error)
      res.status(500).json({ error: "Une erreur est survenue" });
    });
};