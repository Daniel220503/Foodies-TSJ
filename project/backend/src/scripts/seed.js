// seed.js — datos de prueba para TSJ Foodies
// Se ejecuta automáticamente al iniciar el servidor
const bcrypt = require('bcrypt');
const db     = require('../config/db');

async function seed() {
  try {
    const hash = await bcrypt.hash('Test1234!', 10);

    const usuarios = [
      { nombre: 'Administrador TSJ',  email: 'admin@zapopan.tecmm.edu.mx',   rol: 'admin'       },
      { nombre: 'Tacos El Güero',     email: 'tacos@zapopan.tecmm.edu.mx',   rol: 'restaurante' },
      { nombre: 'Tortas La Paloma',   email: 'tortas@zapopan.tecmm.edu.mx',  rol: 'restaurante' },
      { nombre: 'Juan Pérez',         email: 'juan@zapopan.tecmm.edu.mx',    rol: 'cliente'     },
      { nombre: 'María García',       email: 'maria@zapopan.tecmm.edu.mx',   rol: 'cliente'     },
    ];

    for (const u of usuarios) {
      await db.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [u.nombre, u.email, hash, u.rol]
      );
    }

    // Restaurantes
    const { rows: restUsers } = await db.query(
      `SELECT id, email FROM usuarios
       WHERE email IN ('tacos@zapopan.tecmm.edu.mx','tortas@zapopan.tecmm.edu.mx')`
    );

    for (const u of restUsers) {
      const esTacos = u.email.startsWith('tacos');
      const nombre  = esTacos ? 'Tacos El Güero'  : 'Tortas La Paloma';
      const desc    = esTacos
        ? 'Los mejores tacos del TSJ. Pastor, canasta y más.'
        : 'Tortas ahogadas y jugos naturales. Sabor casero.';
      await db.query(
        `INSERT INTO restaurantes (usuario_id, nombre, descripcion, activo, aprobado)
         VALUES ($1, $2, $3, TRUE, TRUE)
         ON CONFLICT DO NOTHING`,
        [u.id, nombre, desc]
      );
    }

    // Categorías y productos
    const { rows: rests } = await db.query(
      `SELECT id, nombre FROM restaurantes WHERE aprobado=TRUE`
    );

    for (const r of rests) {
      if (r.nombre === 'Tacos El Güero') {
        for (const cat of ['Tacos','Bebidas','Postres']) {
          await db.query(
            `INSERT INTO categorias (restaurante_id, nombre) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [r.id, cat]
          );
        }
        const { rows: cats } = await db.query(
          `SELECT id,nombre FROM categorias WHERE restaurante_id=$1`, [r.id]
        );
        const cm = Object.fromEntries(cats.map(c => [c.nombre, c.id]));
        for (const p of [
          { nombre:'Tacos de Pastor',   desc:'Con cilantro, cebolla y piña. 3 pzas.', precio:18, cat:'Tacos',   tiempo:10 },
          { nombre:'Tacos de Canasta',  desc:'Variados, 3 piezas por orden.',          precio:25, cat:'Tacos',   tiempo:5  },
          { nombre:'Agua de Jamaica',   desc:'Fresca de jamaica 500ml.',               precio:15, cat:'Bebidas', tiempo:2  },
          { nombre:'Refresco',          desc:'Lata 355ml.',                            precio:20, cat:'Bebidas', tiempo:1  },
        ]) {
          await db.query(
            `INSERT INTO productos (restaurante_id,categoria_id,nombre,descripcion,precio,tiempo_estimado)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [r.id, cm[p.cat], p.nombre, p.desc, p.precio, p.tiempo]
          );
        }
      }

      if (r.nombre === 'Tortas La Paloma') {
        for (const cat of ['Tortas','Jugos','Snacks']) {
          await db.query(
            `INSERT INTO categorias (restaurante_id, nombre) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [r.id, cat]
          );
        }
        const { rows: cats } = await db.query(
          `SELECT id,nombre FROM categorias WHERE restaurante_id=$1`, [r.id]
        );
        const cm = Object.fromEntries(cats.map(c => [c.nombre, c.id]));
        for (const p of [
          { nombre:'Torta Ahogada',   desc:'De carnitas con salsa roja picante.', precio:55, cat:'Tortas', tiempo:20 },
          { nombre:'Torta de Pierna', desc:'Con aguacate y jitomate.',            precio:50, cat:'Tortas', tiempo:15 },
          { nombre:'Jugo Natural',    desc:'Naranja exprimido 500ml.',            precio:25, cat:'Jugos',  tiempo:5  },
          { nombre:'Papas Fritas',    desc:'Orden con aderezo ranch.',            precio:30, cat:'Snacks', tiempo:10 },
        ]) {
          await db.query(
            `INSERT INTO productos (restaurante_id,categoria_id,nombre,descripcion,precio,tiempo_estimado)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [r.id, cm[p.cat], p.nombre, p.desc, p.precio, p.tiempo]
          );
        }
      }
    }

    console.log('✅ Seed completado');
    console.log('   Usuarios de prueba (contraseña: Test1234!):');
    console.log('   admin@zapopan.tecmm.edu.mx  → Admin');
    console.log('   tacos@zapopan.tecmm.edu.mx  → Restaurante');
    console.log('   tortas@zapopan.tecmm.edu.mx → Restaurante');
    console.log('   juan@zapopan.tecmm.edu.mx   → Alumno');
  } catch (err) {
    console.error('❌ Error en seed:', err.message);
  }
}

module.exports = seed;
