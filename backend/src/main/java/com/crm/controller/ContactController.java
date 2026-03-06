package com.crm.controller;

import com.crm.domain.Contact;
import com.crm.repository.ContactRepository;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
@Observed(name = "contact.controller")
public class ContactController {

    private final ContactRepository repo;

    @GetMapping
    public List<Contact> list() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Contact> get(@PathVariable UUID id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Contact create(@RequestBody Contact contact) {
        return repo.save(contact);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Contact> update(@PathVariable UUID id,
                                          @RequestBody Contact updated) {
        return repo.findById(id).map(c -> {
            c.setName(updated.getName());
            c.setEmail(updated.getEmail());
            c.setPhone(updated.getPhone());
            c.setCompany(updated.getCompany());
            return ResponseEntity.ok(repo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        repo.deleteById(id);
    }
}
